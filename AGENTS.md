# AGENTS.md

This file provides guidance to AI coding agents when working with code in this repository.

## Project Overview

Team Saved Replies is a dual-platform browser extension (Chrome + Firefox) that populates GitHub's saved replies UI with templates fetched from markdown files in GitHub repositories. Templates are parsed from H2 headers followed by markdown code blocks in `.md` files.

## Build and Test

### Build (.NET solution, used for tests only)

```bash
dotnet build src --configuration Release
```

### Run Tests (Playwright + NUnit, currently disabled/ignored)

```bash
# Install Playwright browsers first
pwsh ./install.ps1

# Run tests
dotnet test src --configuration Release
```

Tests use Playwright to launch Chromium with the Chrome extension loaded. The test web host serves fake GitHub pages (`fake-issue.html`, `fake-response.json`) for integration testing.

### Package Extensions

```bash
pwsh ./package.ps1
```

This PowerShell script derives the version from MinVer (`minver -v warn`), updates both `manifest.json` files, and creates ZIP archives for distribution.

## Architecture

### Dual-Platform Extensions

The Chrome and Firefox extensions live in parallel directory structures under `src/`:

- **`src/ChromeExtension/`** - Manifest V3, uses `chrome.*` APIs, service worker background, `sidePanel` API, offscreen documents
- **`src/FirefoxExtension/`** - Manifest V3 with gecko settings, uses `browser.*` APIs, `sidebar_action` API, ES module background scripts

Both extensions share the same conceptual architecture but are **not code-shared at build time**; each has its own copy of files. Firefox has additional modules (e.g., `github-permissions.js`, `sidepanel-elements.js`) because it handles sidebar and permissions differently.

### Extension Component Structure (both platforms)

| Directory | Purpose |
|-----------|---------|
| `pages/content-script/` | Injected into GitHub pages; adds saved reply buttons to comment areas |
| `pages/service-worker/` | Background processing: alarms, storage, messaging, settings |
| `pages/popup/` | Extension popup UI for managing saved reply configurations |
| `pages/sidepanel/` (Chrome) / `pages/sidepanel/` (Firefox) | Side panel UI showing saved replies |
| `pages/options/` | Extension options page |
| `pages/shared-saved-replies-form/` | Form for adding/editing saved reply sources |
| `js/modules/` | Shared utility modules (messaging, DOM creation, theming, etc.) |
| `css/` | Stylesheets including Prism.js syntax highlighting and theme support |

### Key Platform Differences

- Chrome uses `chrome.sidePanel`; Firefox uses `browser.sideAction` (sidebar)
- Chrome service worker is a single file; Firefox uses `"type": "module"` with script array
- Firefox requires explicit `browser_specific_settings.gecko` in manifest
- Chrome has `offscreen` document support; Firefox does not
- Content script injection: Chrome uses messaging; Firefox listens for `"soft-nav:end"` events

### Messaging System

Cross-component communication uses a message protocol with `messageType` (command/event), `target`, and `messageName` fields. Messages route between content scripts, service workers, popups, and side panels.

### Test Infrastructure

- `src/Tests/Tests/` - NUnit test project using Playwright for browser automation
- `src/Tests/WebHost/` - ASP.NET web app serving fake GitHub pages for testing
- `ChromeExtensionPageTest.cs` - Base class that launches Chromium with the extension loaded
- `ChromeExtensionTestServerPageTest.cs` - Manages test web server lifecycle

## Versioning

- Uses **MinVer** to derive semantic versions from git tags
- Tags follow pattern: `MAJOR.MINOR.PATCH` (e.g., `0.0.6`)
- Chrome and Firefox versions may differ (Chrome is currently ahead)
- `package.ps1` auto-updates manifest versions during packaging

## Release Process

- Chrome: Tag triggers GitHub Actions workflow that packages, signs, and uploads to Chrome Web Store
- Firefox: Manual upload to this fork's own listing on the [Firefox Add-ons Developer Hub](https://addons.mozilla.org/en-US/developers/addons)
- See `docs/deploy.md` for deployment instructions

## Code Conventions

- Pure JavaScript (no TypeScript, no bundler, no transpilation)
- No package manager or `node_modules`; all JS dependencies are vendored (e.g., `prism.js`)
- .NET test projects use nullable reference types and implicit usings
- When modifying extension behavior, changes typically need to be applied to **both** Chrome and Firefox extensions separately
