#!/usr/bin/env bash
#
# Packages a browser extension for upload.
#
# Packaging alone never changes anything tracked. Asking for a version does:
# a bump has to be written to the manifest, or the next one would be worked out
# from the same old number again. The change is left unstaged for review.
#
# Usage:
#   ./package.sh                       package chrome at the manifest's version
#   ./package.sh --target firefox      package firefox instead
#   ./package.sh patch                 0.1.0 -> 0.1.1, then package
#   ./package.sh minor                 0.1.0 -> 0.2.0, then package
#   ./package.sh major                 0.1.0 -> 1.0.0, then package
#   ./package.sh --version 1.2.3       set an exact version, then package
#   ./package.sh --output build        write the archive somewhere else
#   ./package.sh --no-verify           skip the pre-package checks
#
set -euo pipefail

readonly REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

TARGET="chrome"
OUTPUT_DIR="$REPO_ROOT/dist"
VERSION=""
BUMP=""
VERIFY=1

die() { printf 'package.sh: %s\n' "$1" >&2; exit 1; }

# Prints the comment header above, so the two cannot drift apart.
usage() {
    awk 'NR == 1 { next } /^#/ { sub(/^# ?/, ""); print; next } { exit }' "${BASH_SOURCE[0]}"
    exit "${1:-0}"
}

while [ $# -gt 0 ]; do
    case "$1" in
        -t|--target)  TARGET="${2:-}";     shift 2 || die "--target needs a value" ;;
        -v|--version) VERSION="${2:-}";    shift 2 || die "--version needs a value" ;;
        -o|--output)  OUTPUT_DIR="${2:-}"; shift 2 || die "--output needs a value" ;;
        --no-verify)  VERIFY=0;            shift ;;
        major|minor|patch)
                      [ -z "$BUMP" ] || die "give one of major, minor or patch, not several"
                      BUMP="$1";           shift ;;
        -h|--help)    usage 0 ;;
        *)            printf 'package.sh: unknown option %s\n\n' "$1" >&2; usage 1 ;;
    esac
done

command -v zip     >/dev/null || die "zip is required"
command -v python3 >/dev/null || die "python3 is required"

# Resolved here rather than in a function, because die inside a command
# substitution would only exit the subshell and let packaging carry on.
# Firefox slots in as another branch once its port lands.
case "$TARGET" in
    chrome)  SOURCE_DIR="$REPO_ROOT/src/ChromeExtension" ;;
    firefox) SOURCE_DIR="$REPO_ROOT/src/FirefoxExtension" ;;
    *)       die "unknown target '$TARGET' (supported: chrome, firefox)" ;;
esac
readonly SOURCE_DIR

[ -f "$SOURCE_DIR/manifest.json" ] || die "no manifest.json in $SOURCE_DIR"

if [ -n "$VERSION" ] && [ -n "$BUMP" ]; then
    die "--version sets an exact version; use it or a bump, not both"
fi

if [ -n "$VERSION" ]; then
    printf '%s' "$VERSION" | grep -Eq '^[0-9]+(\.[0-9]+){0,3}$' \
        || die "version '$VERSION' is not a dotted number, which is all a manifest accepts"
fi

PREVIOUS_VERSION="$(python3 -c "
import io, json, sys
print(json.load(io.open(sys.argv[1], encoding='utf-8')).get('version', '0.0.0'))
" "$SOURCE_DIR/manifest.json")"

if [ -n "$BUMP" ]; then
    VERSION="$(python3 -c "
import sys
parts = [int(p) for p in sys.argv[1].split('.')][:3]
parts += [0] * (3 - len(parts))
major, minor, patch = parts
if sys.argv[2] == 'major':   major, minor, patch = major + 1, 0, 0
elif sys.argv[2] == 'minor': minor, patch = minor + 1, 0
else:                        patch += 1
print(f'{major}.{minor}.{patch}')
" "$PREVIOUS_VERSION" "$BUMP")"
fi

# Written to the manifest rather than only to the archive, so the number moves
# forward for real. Left unstaged deliberately - committing it is a decision.
if [ -n "$VERSION" ] && [ "$VERSION" != "$PREVIOUS_VERSION" ]; then
    python3 - "$SOURCE_DIR/manifest.json" "$VERSION" <<'PY'
import io, json, re, sys

path, version = sys.argv[1], sys.argv[2]
text = io.open(path, encoding='utf-8').read()

# Replaced textually rather than by reloading and dumping the json, which would
# reformat the whole file and bury a one line change in a rewrite of it.
updated, count = re.subn(r'("version"\s*:\s*")[^"]*(")',
                         lambda m: m.group(1) + version + m.group(2), text, count=1)

if count != 1:
    sys.exit(f"could not find a version to update in {path}")

io.open(path, 'w', encoding='utf-8', newline='').write(updated)

if json.loads(updated)['version'] != version:
    sys.exit(f"version was not applied to {path}")
PY
    printf 'version  : %s -> %s (manifest.json updated, not staged)\n' "$PREVIOUS_VERSION" "$VERSION"
fi

STAGING="$(mktemp -d)"
trap 'rm -rf "$STAGING"' EXIT

cp -r "$SOURCE_DIR/." "$STAGING/"

# Strip anything that is only useful while developing.
find "$STAGING" \( -name '.DS_Store' -o -name 'Thumbs.db' -o -name '*.map' \
                -o -name 'stub-chrome.js' -o -name '__MACOSX' -o -name 'node_modules' \) \
     -exec rm -rf {} + 2>/dev/null || true

read -r NAME PACKAGE_VERSION SLUG <<EOF
$(python3 - "$STAGING/manifest.json" <<'PY'
import io, json, re, sys
m = json.load(io.open(sys.argv[1], encoding='utf-8'))
name = m.get('name') or 'extension'
slug = re.sub(r'-+', '-', re.sub(r'[^a-z0-9]+', '-', name.lower())).strip('-')
print(name.replace(' ', '_'), m.get('version', '0.0.0'), slug)
PY
)
EOF

# Refuse to build a package that references files it does not contain. A rename
# that misses one reference is otherwise only discovered after uploading.
if [ "$VERIFY" -eq 1 ]; then
    if ! python3 - "$STAGING" <<'PY'
import io, json, os, re, sys

root = sys.argv[1]
problems = []

manifest = json.load(io.open(os.path.join(root, 'manifest.json'), encoding='utf-8'))

referenced = []
# Chrome and Firefox describe the same things differently: a service worker
# against background scripts, a side panel against a sidebar.
for section, key in (('action', 'default_popup'), ('background', 'service_worker'),
                     ('side_panel', 'default_path'), ('sidebar_action', 'default_panel'),
                     ('options_ui', 'page')):
    value = manifest.get(section, {}).get(key)
    if value:
        referenced.append(value)

referenced += manifest.get('background', {}).get('scripts', [])
for script in manifest.get('content_scripts', []):
    referenced += script.get('js', []) + script.get('css', [])
referenced += list(manifest.get('icons', {}).values())

for path in referenced:
    if not os.path.isfile(os.path.join(root, path)):
        problems.append(f"manifest references missing file: {path}")

# Anything a packaged page links to has to be in the package too.
for current, _, files in os.walk(root):
    for name in files:
        if not name.endswith('.html'):
            continue
        page = os.path.join(current, name)
        html = io.open(page, encoding='utf-8', errors='replace').read()
        for ref in re.findall(r'(?:href|src)="([^"]+)"', html):
            if ref.startswith(('http://', 'https://', 'data:', '#')):
                continue
            if not os.path.isfile(os.path.normpath(os.path.join(current, ref))):
                problems.append(f"{os.path.relpath(page, root)} references missing file: {ref}")

for problem in problems:
    print(f"  {problem}", file=sys.stderr)
sys.exit(1 if problems else 0)
PY
    then
        die "verification failed - package not written"
    fi

    # Parse every script, so a syntax error cannot reach the store.
    if command -v node >/dev/null; then
        scratch="$STAGING/.parse-check.mjs"
        failed=0
        while IFS= read -r script; do
            cp "$script" "$scratch"
            node --check "$scratch" >/dev/null 2>&1 || {
                printf '  syntax error: %s\n' "${script#"$STAGING"/}" >&2; failed=1; }
        done < <(find "$STAGING" -name '*.js' -not -name '.parse-check.mjs')
        rm -f "$scratch"
        [ "$failed" -eq 0 ] || die "verification failed - package not written"
    fi
fi

mkdir -p "$OUTPUT_DIR"
readonly ARCHIVE="$OUTPUT_DIR/$SLUG-$TARGET-$PACKAGE_VERSION.zip"
rm -f "$ARCHIVE"

# Zipped from inside the staging directory so manifest.json sits at the archive
# root, which is what the stores require.
( cd "$STAGING" && zip -rq "$ARCHIVE" . -x '.parse-check.mjs' )

file_count="$(unzip -l "$ARCHIVE" | tail -1 | awk '{print $2}')"
size="$(du -h "$ARCHIVE" | cut -f1)"

printf 'packaged %s %s\n' "$(printf '%s' "$NAME" | tr '_' ' ')" "$PACKAGE_VERSION"
printf '  archive : %s\n' "$ARCHIVE"
printf '  size    : %s across %s files\n' "$size" "$file_count"

# Hand the details to the workflow when running in GitHub Actions.
if [ -n "${GITHUB_ENV:-}" ] && [ -f "${GITHUB_ENV}" ]; then
    {
        printf 'EXTENSION=%s\n' "$SLUG-$TARGET-$PACKAGE_VERSION"
        printf 'EXTENSION_ZIP=%s\n' "$ARCHIVE"
        printf 'EXTENSION_VERSION=%s\n' "$PACKAGE_VERSION"
    } >> "$GITHUB_ENV"
fi
if [ -n "${GITHUB_OUTPUT:-}" ] && [ -f "${GITHUB_OUTPUT}" ]; then
    {
        printf 'archive=%s\n' "$ARCHIVE"
        printf 'version=%s\n' "$PACKAGE_VERSION"
    } >> "$GITHUB_OUTPUT"
fi
