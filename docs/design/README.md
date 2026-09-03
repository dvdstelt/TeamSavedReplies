# Handoff: Team Saved Replies — popup, side panel, edge tab, options

## Overview

A redesign of the **Team Saved Replies** browser extension (Chrome + Firefox, source at `src/ChromeExtension` / `src/FirefoxExtension`). Four surfaces change:

1. **Popup** (extension icon, left-click) — was a list of *configured sources*; becomes a list of *templates* you copy to the clipboard.
2. **Side panel** — was one flat list with a copy icon and an expand chevron; becomes a scannable list with a "Recently used" section and per-repo groups.
3. **Edge tab** on GitHub — was a 36×36 grey half-rounded square pinned at `bottom: 50vh`; becomes a labelled ink tab that expands on hover.
4. **Options page** — was a dialog with a theme picker plus one set of "defaults"; becomes a full options page with a global strip and one panel per source.

**Not in scope:** the replies injected into GitHub's own saved-replies dialog. That UI is GitHub's and stays exactly as it is.

**Removed:** the theme picker and `css/themes.css`. There is one appearance.

## About the design files

The files in this bundle are **design references created in HTML** — prototypes showing intended look and behaviour, not production code to copy. The extension is plain HTML/CSS/vanilla JS with a `createElement` helper (`js/create-element.js`); recreate these designs in that existing environment, following the repo's established patterns (one `.css` per page, `createElement` trees in `*-elements.js`, message passing through `js/messaging.js`).

The prototype is a single file, `Saved Replies Redesign.dc.html`. It is a streaming component with inline styles, so read values from the markup rather than from a stylesheet. It contains three sections:

- **Turn 2 / `#2a`** — the options page.
- **Turn 1 / `#1a`** — the **current** UI, recreated faithfully from `popup.css`, `popup.html`, `saved-replies-sidepanel.css`, `sidepanel-elements.js`, `saved-replies-button-element.js` and `sidepanel-button.css`. Use it as the before/after reference; do not build it.
- **Turn 1 / `#1b`** — the **redesign** of popup, side panel and edge tab. This is what to build.

## Fidelity

**High-fidelity.** Colors, type, spacing, sizes and interaction states are final. Recreate pixel-perfectly.

## Design tokens

The design follows the *Modernist* system: flat, zero corner radius, strong 2px rules, everything flush left, one red accent used sparingly.

### Color

| Token | Value | Use |
| --- | --- | --- |
| ground | `#f3f2f2` | page and list background |
| surface | `#eae9e9` | group headers, source panels |
| surface hover | `#e0dede` | group header hover |
| row hover | `#ffffff` | list row hover, input fills |
| ink | `#201e1d` | text, 2px rules, active segment fill |
| neutral-300 | `#d7d3d3` | 1px row dividers |
| neutral-500 | `#9b9797` | the muted copy glyph on rows |
| neutral-600 | `#7d7979` | labels 12px and up |
| neutral-700 | `#605d5d` | helper text at 9–11px (contrast) |
| neutral-800 | `#444141` | body copy |
| accent | `#ec3013` | Save, hover fills, edge-tab rule, "Copied", left hover rule |
| accent-600 | `#dd2b0f` | pressed / hover on accent fills |
| accent-700 | `#ae1800` | accent-colored text at paragraph size, badge text |
| accent tint | `rgba(236,48,19,0.1)` | repo badge fill |
| accent-200 | `#ffe0d9` | ghost-button hover tint |

Do not introduce a hex outside this list. Contrast rule: **`#7d7979` only at 12px and above**; anything 9–11px uses `#605d5d`.

### Type

- **Archivo** everywhere (400/600/700/800). `https://fonts.googleapis.com/css2?family=Archivo:wght@400;500;600;700;800`
- **IBM Plex Mono** *only* where the content is literally code or a URL: the source-URL field, the `https://github.com/` prefix and owner input, the refresh-rate number field, inline `<code>`. Never for UI labels.
- Section labels: Archivo, 10–11px, weight 700–800, `letter-spacing: 0.14em`, uppercase.
- Small meta labels (counts, group names, "Synced 4 min ago"): Archivo, 9–10px, weight 600, `letter-spacing: 0.08em`, uppercase.
- Row titles: Archivo 14px / 700, `letter-spacing: -0.01em`.
- Field labels: Archivo 12px / 600.
- Helper text: Archivo 11px / 400, `line-height: 1.5`.
- Page title: Archivo 26px / 800, `letter-spacing: -0.02em`.

### Geometry

- **Border radius: 0 everywhere.** No exceptions.
- Rules: **2px solid `#201e1d`** between major sections; **1px solid `#d7d3d3`** between list rows.
- Spacing scale: 4 / 8 / 12 / 16 / 24 / 32.
- Elevation (prototype only, for the canvas): `0 3px 10px rgba(45,43,43,0.16)`. In the real extension the popup and panel are already framed by the browser — no shadow needed.

---

## Screen 1 — Popup

**Files:** `pages/popup/popup.html`, `pages/popup/popup.css`, `pages/popup/popup.js`, and a new row builder replacing `pages/popup/saved-replies-button-element.js`.

**Purpose:** find a template fast and copy it to the clipboard. Nothing else.

**Size:** 375 × 600 (unchanged).

### Layout — four stacked bands, `display: flex; flex-direction: column`

**1. Header** — `padding: 14px 16px 12px`, `border-bottom: 2px solid #201e1d`, ground fill, `justify-content: space-between`.
- Left, a 2px-gap column:
  - `SAVED REPLIES` — 13px / 800, `letter-spacing: 0.06em`, uppercase, `line-height: 1`.
  - Sub-line — 11px, `#605d5d`, weight 600, `letter-spacing: 0.08em`, uppercase. Content: with one repo, `<repo name> · N templates` (e.g. `Particular · 10 templates`); with more than one, `N repos · M templates`.
- Right: gear icon button, 30 × 30, `border: 1px solid transparent`, 18px glyph in ink. Hover: `background: #ffe0d9; border-color: #ec3013`. **This is the only route to the options page.**

**2. Search** — `padding: 12px 16px`, `border-bottom: 1px solid #d7d3d3`.
- Input: full width, 34px tall, `border: 1px solid #201e1d`, white fill, 13px Archivo, `padding: 0 12px 0 32px`, `outline: none`, placeholder `Filter templates`.
- 14px search glyph absolutely positioned at `left: 11px`, fill `#7d7979`.
- Filtering matches **template name and body**, case-insensitive.

**3. List** — `flex: 1; overflow: auto`.

Always grouped, one group per configured source, **even when there is only one** — with a single repo that header is simply the line naming it.

- **Group header** — clickable, `padding: 9px 16px 8px`, `background: #eae9e9`, `border-bottom: 2px solid #201e1d`, `gap: 8px`, `cursor: pointer`. Hover `#e0dede`.
  - 9px chevron in ink; `transform: rotate(0deg)` when open, `rotate(-90deg)` when collapsed.
  - Repo name, flex-1, 10px / 600, `letter-spacing: 0.04em`, uppercase.
  - Count, right: `N templates`, 9px, `#605d5d`, 600, uppercase.
  - Clicking toggles the group. Collapsed state is per repo and should persist (`chrome.storage.local`) so the popup reopens as you left it.
- **Row** — the whole row is the copy target. `height: 44px`, `padding: 0 16px`, `display: flex; align-items: center; gap: 10px`, `border-bottom: 1px solid #d7d3d3`, ground fill, `cursor: pointer`, `title="Click to copy to clipboard"`.
  - Name: flex-1, 14px / 700, `letter-spacing: -0.01em`, single line with ellipsis.
  - `COPIED` label, shown for 1.5s after a copy: 10px / 800, `letter-spacing: 0.1em`, uppercase, `#ec3013`.
  - Copy glyph, always present, right-most: 14 × 14, fill `#9b9797`. **Decorative** — it is the affordance that says "clicking copies", not a separate button. Do not attach a handler to it.
  - Hover: `background: #ffffff; box-shadow: inset 3px 0 0 #ec3013`.
- **Empty search state** — `padding: 40px 16px`: `Nothing matches "<query>"` at 14px / 700, then `Filtering runs over template names and bodies.` at 12px `#605d5d`.

**4. Footer** — `border-top: 2px solid #201e1d`, `padding: 10px 16px`. One item, flush left: `Synced N min ago`, 10px `#605d5d` / 600 uppercase. **No "Manage sources" link** — configuration is reachable only through the header gear.

### Removed from the old popup

Source rows with avatar / URL / pencil / trash; the blue `#00a3c4` header bar; the plus button; the radial-gradient background; the footer gear card; the per-row markdown preview line; the per-row repo badge; the row-expands-to-markdown behaviour; the per-row `COPY` button.

---

## Screen 2 — Side panel

**Files:** `pages/sidepanel/saved-replies-sidepanel.html`, `.css`, `.js`, `sidepanel-elements.js`, `saved-replies-items.js`.

**Purpose:** browse everything available on the current page, with what you used recently at the top.

**Width:** 360 (host-controlled), full height.

### Layout

**1. Header** — identical to the popup header minus the sub-line: `SAVED REPLIES` 13px / 800 uppercase, gear at the right, `border-bottom: 2px solid #201e1d`, `padding: 14px 16px 12px`.

**2. Search** — as the popup, placeholder `Filter name or body`, `border-bottom: 1px solid #d7d3d3`.

**3. List** — `flex: 1; overflow: auto`.

- **"Recently used" section** — shown only when the search box is empty. Header: `padding: 10px 16px 8px`, `background: #eae9e9`, `border-bottom: 2px solid #201e1d`; `RECENTLY USED` at 10px / 800 `letter-spacing: 0.14em` uppercase on the left, `AUTOMATIC` at 9px `#605d5d` on the right.
  - The **last three templates copied**, most recent first. Maintained automatically — there is no starring, no favourites UI. Persist the list of ids in `chrome.storage.local`.
  - Rows are the same 44px copy rows as the popup, with one addition: because recency crosses repos, a **repo badge** sits after the name **only when more than one source is configured** — 9px, `letter-spacing: 0.06em`, uppercase, `color: #ae1800`, `border: 1px solid #ec3013`, `background: rgba(236,48,19,0.1)`, `padding: 1px 5px`. With a single repo the badge is not rendered.
- **Repo groups** — one per source, header identical to the popup's group header (in the panel it does not need to collapse), then the same 44px copy rows. No badges here: the header already names the repo.

There is **no expansion and no markdown preview** in the panel. Clicking a row copies, exactly as in the popup.

### Open question for implementation

If the extension can write into GitHub's comment textarea, a row click could **insert** instead of copy. Either way it stays one behaviour per row — never an insert button and a copy button side by side.

### Removed from the old panel

64px rows; the 21px muted-grey titles (`rgba(64,82,109,0.7)`); the copy button in the 40px icon slot; the expand chevron; the Prism-highlighted `<pre>` body and `css/prism.css`; the floating `Template copied!` overlay (replaced by the inline `COPIED` label); the blue header bar.

---

## Screen 3 — Edge tab on GitHub

**Files:** `pages/sidepanel/saved-replies-sidepanel-toggle-button.js`, `pages/sidepanel/sidepanel-button.css`, icon `pages/sidepanel/saved-replies-icon.svg`.

**Purpose:** open the side panel from any GitHub page, and be legible about what it is.

### Collapsed (default)

- `position: fixed; right: 0`, vertically at the position the user last dragged it to (default around 44% from the top). `z-index: 9999`.
- **26 wide × 76 tall**, `background: #201e1d`, `border-left: 2px solid #ec3013`, **radius 0**, flush to the viewport edge.
- Centered 16 × 16 extension icon, `filter: invert(1)` so it reads white on ink.

### Hover / focus

Widens in place, still right-anchored, still 76 tall, `padding: 0 12px 0 10px`, same ink fill and accent rule, `gap: 9px`:
- 16 × 16 inverted icon.
- A 2px-gap column:
  - Label — Archivo 11px / 800, `letter-spacing: 0.08em`, uppercase, white. Default `Saved replies`.
  - Sub-line — 9px, `#bab6b6`, 600, uppercase: `<repo/count> · ctrl .`

Animate the width with a short transition; keep the icon's position stable so it does not jump. Drag-to-reposition is retained and the position persists.

Visibility is controlled by **Show edge tab on GitHub** in options. Off still leaves the replies in GitHub's own dialog and in the popup.

---

## Screen 4 — Options page

**Files:** `pages/options/options.html`, `options.css`, `options.js`. Opens in a tab, not as a dialog. Delete the theme `<select>` and `css/themes.css`.

**Width:** 860. Ground `#f3f2f2`.

### 1. Page header
`padding: 22px 28px 16px`, `border-bottom: 2px solid #201e1d`, `align-items: flex-end`, `justify-content: space-between`.
- Left: kicker `TEAM SAVED REPLIES` 11px / 700 `letter-spacing: 0.16em` uppercase `#7d7979`; title `Settings` 26px / 800 `letter-spacing: -0.02em`.
- Right: version, 10px `#605d5d` / 600 `letter-spacing: 0.08em` (not uppercased).

### 2. Global strip
`padding: 22px 28px 24px`, `border-bottom: 2px solid #201e1d`. Label `GLOBAL` 11px / 800 `letter-spacing: 0.14em` uppercase, `margin-bottom: 14px`. Then a `grid-template-columns: 1fr 1fr; gap: 28px`:

- **Refresh rate in minutes** — label 12px / 600; `<input type="number" min="1" max="1440">`, 110 × 34, `border: 1px solid #201e1d`, white, IBM Plex Mono 13px, `padding: 0 10px`. Helper: *How often every source is re-fetched and cached. A refresh takes a few hundred milliseconds.*
- **Show edge tab on GitHub** — label 12px / 600; a two-option segmented control. Helper: *Off still leaves the replies in GitHub's own saved-replies dialog and in the extension popup.*

### Segmented control (used for all three toggles)

Replaces the old `toggle.css` switches.

- Wrapper: `display: flex; border: 1px solid #201e1d; width: fit-content`, radius 0.
- Each option: `height: 34px` (32px inside a source panel), `padding: 0 14–16px`, 12px / 700, `cursor: pointer`. A `1px solid #201e1d` divider on the first option's right edge.
- Selected: `background: #201e1d; color: #ffffff`.
- Unselected: `background: transparent; color: #605d5d`.
- Keyboard focus: `outline: 2px solid #ec3013; outline-offset: 2px`.

### 3. Sources

Section head: `padding: 22px 28px 8px`, `SOURCES` on the left, `N SOURCE(S)` at 10px `#605d5d` on the right.

Then one **source panel** per source: `margin: 0 28px 18px`, `border-top: 2px solid #201e1d`, `background: #eae9e9`.

**Panel header** — `padding: 10px 16px`, `border-bottom: 1px solid #d7d3d3`, space-between:
- Index `01`, `02` … 11px `#605d5d` / 600 uppercase; then the source name at 14px / 700, falling back to `Untitled source` when empty.
- `REMOVE` on the right: 10px / 700 `letter-spacing: 0.1em` uppercase, `color: #ae1800`, `padding: 4px 6px`, hover `background: #ffe0d9`.

**Panel body** — `padding: 16px`, `display: flex; flex-direction: column; gap: 18px`:

1. `grid-template-columns: 220px 1fr; gap: 16px`
   - **Name** — text input, 34px, ink border, white, Archivo 13px. Placeholder `Particular`. This name is what the popup header and the group headers display.
   - **Templates URL** — text input, 34px, IBM Plex Mono 12px. Placeholder `https://github.com/Particular/docs/blob/main/saved-replies.md`. Helper: *The GitHub page for the .md file, not the raw URL. Private repos work if you can read them.*
2. **Where this source applies** — `border-top: 1px solid #d7d3d3; padding-top: 16px`. Label 12px / 600, then a segmented control: **All of GitHub** / **One organization or user**.
   - When *One organization or user* is selected, a composed field appears: `display: flex; align-items: center; height: 32px; border: 1px solid #201e1d; background: #fff; width: fit-content` containing a static `https://github.com/` prefix (IBM Plex Mono 12px, `#7d7979`, `padding-left: 10px`), a borderless 190px input (IBM Plex Mono 12px, placeholder `[organization]`), and a static trailing `/`.
   - **On input, strip a pasted prefix**: `value.replace(/^https?:\/\/github\.com\//i, "").replace(/\/$/, "")` — pasting a full org URL leaves just the name.
   - Helper: *Paste the full organization or user URL and the prefix is stripped for you.*
   - When the field is empty: warning at 11px `#ae1800` — *Without an organization or user this source will not show anywhere.*
   - Exactly one organization or user per source. Two orgs means two sources.
3. **Applies to** — `border-top: 1px solid #d7d3d3; padding-top: 16px`, `grid-template-columns: 1fr 1fr; gap: 16px`. Two segmented On/Off controls: **Applies to issues** and **Applies to pull requests**. These live on the source; there is no separate "defaults" screen carrying a second copy of the same switches.

**Add source** — `padding: 0 28px 24px`. A 38px-tall button, `border: 2px solid #201e1d`, `padding: 0 14px`, `gap: 10px`, 12px / 700 `letter-spacing: 0.08em` uppercase, a 12px plus glyph then the label `Add source`, label flush left. Hover inverts to `background: #201e1d; color: #fff`. Appends an empty source: `{ name: "", url: "", scope: "all", owner: "", issues: true, prs: true }`.

### 4. Action bar
`border-top: 2px solid #201e1d`, `padding: 16px 28px`, `gap: 12px`.
- **Save** — 38px, `background: #ec3013`, white, 12px / 700 `letter-spacing: 0.08em` uppercase, `padding: 0 18px`. Hover `#dd2b0f`. Label flush left.
- **Cancel** — 38px, `border: 1px solid #201e1d`, transparent, same type. Hover `background: #ffe0d9`.
- `Last sync N min ago` pushed right with `margin-left: auto`, 10px `#605d5d`.

---

## Interactions & behaviour

| Trigger | Result |
| --- | --- |
| Click a template row (popup or panel) | Write `reply.body` to the clipboard via `navigator.clipboard.writeText`; show `COPIED` on that row for **1500ms**; push the id onto "recently used" (cap 3, most recent first, de-duplicated) |
| Click a group header (popup) | Collapse / expand that repo's rows; rotate the chevron `0deg ↔ -90deg`; persist per repo |
| Type in search | Filter on name **and** body, case-insensitive; in the panel, an active query hides the "Recently used" section |
| Click the gear | Open the options page |
| Hover the edge tab | Expand to icon + label + shortcut |
| Click the edge tab | Toggle the side panel (existing `OpenTeamSavedRepliesPanel` / `CloseTeamSavedRepliesPanel` messages) |
| Drag the edge tab | Reposition vertically; persist |
| Options: segmented option | Set that field on the source (or globally) immediately in local state; commit on **Save** |
| Options: type in the owner field | Strip any `https://github.com/` prefix and trailing slash |
| Options: Remove | Drop that source from the list |
| Options: Add source | Append an empty source panel |

**Hover states** (all themed, no browser defaults):
- List row: `#ffffff` fill + `inset 3px 0 0 #ec3013`.
- Group header: `#e0dede`.
- Icon button: `#ffe0d9` fill + `#ec3013` border.
- Accent button: `#dd2b0f`.
- Ghost / outlined button: `#ffe0d9`.
- Outlined "Add source": inverts to ink.

**Keyboard focus:** `:focus-visible { outline: 2px solid #ec3013; outline-offset: 2px; }` on every interactive element. Rows should be reachable by Tab and copy on Enter/Space. The default blue ring must not appear anywhere.

**Empty and error states:** popup no-match message (above); the source-panel owner warning (above); a source with no name renders as `Untitled source` in its panel header.

## State

**Persisted (`chrome.storage`):**
- `sources: [{ id, name, url, scope: "all" | "orgs", owner, issues, prs }]`
- `refreshRateInMinutes: number` (default 30)
- `showEdgeTab: boolean` (default true)
- `recentlyUsed: string[]` — template ids, max 3
- `collapsedGroups: { [sourceName]: boolean }`
- edge-tab vertical position
- the cached templates per source (existing behaviour)

**Ephemeral (per view):**
- `query` — popup search
- `panelQuery` — panel search
- `copiedId` + its 1500ms timer
- `edgeTabHovered`
- options: the working copy of `sources` and the two globals until Save

**Data:** unchanged. Templates are parsed out of each source's markdown file as `## Heading` followed by a fenced code block, on the existing refresh schedule. Which sources appear on a given tab is decided by `scope`/`owner` and the `issues`/`prs` flags against the current URL — that is why the popup groups can differ between two GitHub tabs.

## Assets

All icons in the prototype are the repo's own SVG path data, lifted verbatim — no new artwork:

| Icon | Source in repo |
| --- | --- |
| Search | inline in `pages/popup/popup.html` and `saved-replies-sidepanel.html` |
| Plus | inline in `pages/popup/popup.html` |
| Copy | `copySvgPath` in `pages/sidepanel/sidepanel-elements.js` (also `pages/sidepanel/copy.svg`) |
| Chevron | `pages/sidepanel/expand.svg` / `expandSvgPath` |
| Gear | inline in `pages/popup/popup.html` |
| Pencil, trash | `createPencilSvg` / `createTrashCanSvg` in `pages/popup/saved-replies-button-element.js` — used in the 1a recreation only; both are removed by the redesign |
| Extension icon (edge tab) | `pages/sidepanel/saved-replies-icon.svg`, rendered `filter: invert(1)` |

The design system specifies Lucide (https://lucide.dev) for any icon not already in the repo. Nothing new was needed.

Copies of the two assets referenced by the prototype are in `assets/` in this bundle.

## Files in this bundle

- `screenshots/01-options-page.png` — the options page (screen 4).
- `screenshots/02-redesign-popup-panel-edgetab.png` — popup, side panel and edge tab (screens 1–3).
- `screenshots/03-current-ui-recreated.png` — the current UI, for before/after comparison. Do not build this.
- `Saved Replies Redesign.dc.html` — the prototype. Open it in a browser; it is self-contained apart from the two files below.
- `assets/saved-replies-icon.svg`, `assets/copy.svg` — copied from the extension.
- `_ds/` — the Modernist stylesheet the prototype links, for token reference.

The prototype's tweak controls (repo count, "Recently used" on/off, edge-tab label) exist to demonstrate variants; they are not features to build.
