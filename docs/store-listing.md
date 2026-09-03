# Chrome Web Store listing

Copy for the Developer Dashboard. Kept here so it is versioned with the code it describes.

## Category

**Developer Tools.**

The audience is people working in GitHub issues and pull requests, which is where that category's browsers are looking. *Workflow & Planning* is the defensible alternative, since the extension is really about team communication rather than code, but it puts the listing next to calendars and to-do apps rather than next to the other GitHub tooling.

## Name

Team Saved Replies

## Summary

Short description, 132 characters maximum.

> Share one set of comment templates with your team on GitHub. Keep them in a markdown file and everyone stays in sync.

## Detailed description

The store renders this as plain text, so it uses line breaks rather than markdown.

> GitHub's saved replies are personal. Everyone on a team ends up writing their own version of the same answer, and they drift apart.
>
> Team Saved Replies fixes that by keeping the templates in a markdown file in a repository you already have. Anyone who can read that file gets the same replies, and when someone improves one, everyone picks it up on the next refresh.
>
> HOW IT WORKS
>
> Write templates in a markdown file: a heading for the name, a fenced code block for the reply. Commit it. Point the extension at that file's page on GitHub. That is the whole setup.
>
> WHERE THE TEMPLATES SHOW UP
>
> - In GitHub's own saved replies dialog, alongside your personal ones, on issues and pull requests.
> - In the extension popup, as a searchable list you can copy from.
> - In a side panel, with what you used recently at the top, grouped by repository.
> - Behind a tab on the edge of the GitHub page, which opens the side panel.
>
> CONFIGURING IT
>
> Add as many template files as you like. Each one can apply to all of GitHub or be limited to a single organisation, and to issues, pull requests, or both. So a source for your own organisation and one for an open source project you maintain can sit side by side without getting in each other's way.
>
> Templates are re-fetched on a schedule you choose, and you can sync any source by hand to check a URL works.
>
> PRIVACY
>
> Nothing is collected and nothing is sent anywhere. Your sources and the cached templates stay in your browser's local storage. The only network request the extension makes is to the GitHub page you configured, using your own GitHub session, which is why private repositories work if you can already read them.

### Paragraph to add once the inline menu ships

Not in the current build. Add under "WHERE THE TEMPLATES SHOW UP" when `feature/inline-template-menu` is merged.

> - Inline as you type. Type ! at the start of a word in any comment box and a filtered list appears at the cursor. Keep typing to narrow it, press Enter to insert. The list is ordered by what you use most, so the reply you reach for daily is usually the first one. The trigger can be changed or switched off.

## Single purpose

Required by review.

> Team Saved Replies gives a team one shared set of comment templates on GitHub. The templates live in a markdown file in a repository, and the extension makes them available wherever the user writes a comment on github.com.

## Permission justifications

One per permission; review rejects vague answers.

| Permission | Justification |
| --- | --- |
| `storage` | Stores the configured template sources and the cached templates locally. No other persistence is used. |
| `alarms` | Schedules the periodic re-fetch of each source at the interval the user sets. |
| `offscreen` | Templates are parsed out of GitHub's rendered markdown page. A service worker has no DOM, so the parsing happens in an offscreen document. |
| `tabs` | Reads the URL of the active tab to decide which sources apply to the page being viewed, since a source can be scoped to one organisation and to issues or pull requests. |
| `webNavigation` | GitHub navigates client side. This detects those navigations so the page's state is re-evaluated without a reload. |
| `sidePanel` | Provides the side panel listing of templates. |
| `activeTab` | See the note below; likely removable. |
| `https://github.com/*` | The extension only runs on GitHub, and fetches the templates file from the GitHub URL the user configured. |

## Host permissions justification

Every match pattern in the manifest is the same one, `https://github.com/*`, in `host_permissions`, `content_scripts` and `web_accessible_resources`. No wildcard and no `<all_urls>`, which is the thing this field is really screening for.

> The extension declares one host pattern, https://github.com/*, in host_permissions, content_scripts and web_accessible_resources. It is the only pattern requested and the extension does nothing on any other site.
>
> It is needed for three things, all on github.com:
>
> 1. Running the content script that adds the team's shared templates into GitHub's own saved replies list on issues and pull requests, and inserts a chosen template into the comment box at the cursor.
> 2. Fetching the templates themselves. The user configures a GitHub URL pointing at a markdown file in a repository, and the extension requests that page to read the templates from it. The request uses the user's existing GitHub session, which is why templates in a private repository work for users who can already read that repository.
> 3. Serving the extension's own icon to the GitHub page it injects into.
>
> No wildcard or <all_urls> pattern is requested. The permission is not used to observe browsing: the current tab's URL is read only to decide which of the user's configured template sources apply to the page being viewed, and it is never transmitted anywhere.

Shorter, if the field is cramped:

> https://github.com/* is the only host pattern requested. It is required to inject the team's shared reply templates into GitHub's comment and saved-replies UI, and to fetch the user-configured markdown file those templates come from. The extension runs on no other site and requests no wildcard pattern.

### `activeTab` is probably unnecessary

Content scripts are declared for `https://github.com/*` and the matching host permission is already requested, so the temporary access `activeTab` grants is not obviously used by anything. Removing it would shorten the install prompt. It should be dropped only after confirming in a real install that the popup, side panel and edge tab all still work.

## Data usage disclosures

- Does not collect or transmit any user data.
- No personally identifiable information, health, financial, authentication, personal communications, location, web history or user activity is collected.
- No data is sold or transferred to third parties.
- Privacy policy: docs/privacy-policy.md in this repository, linked from the listing.

## Privacy policy URL

Strictly, Google requires a policy only where an extension handles personal or sensitive user data, and this one certifies that it collects none. In practice a reviewer looking at `tabs` plus a host permission may ask anyway, and a rejection costs days while providing a link costs nothing. So there is one.

Once the repository is pushed it is served at:

    https://github.com/dvdstelt/SharedSavedReplies/blob/main/docs/privacy-policy.md

GitHub Pages would give a tidier URL if that matters, but a rendered file in a public repository is an accepted location.

## Assets still needed

- 128 x 128 store icon.
- At least one screenshot at 1280 x 800 or 640 x 400. The popup over a GitHub issue, and the options page, are the two that explain it fastest.
- Optional 440 x 280 small promo tile.
