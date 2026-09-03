# Privacy policy

**Team Saved Replies** browser extension. Last updated 3 September 2026.

## The short version

The extension collects nothing, sends nothing to anyone, and has no servers. Everything it stores stays in your own browser. The only request it makes over the network is to the GitHub page you told it to read your templates from.

## What is stored, and where

All of it lives in your browser's local extension storage. None of it is transmitted anywhere.

| Stored | Why |
| --- | --- |
| The template sources you configure: name, URL, whether they apply to one organisation, and whether they apply to issues or pull requests | So the extension knows what to fetch and where the templates apply |
| The templates fetched from those sources, and when each was last fetched | So they are available without re-fetching on every page |
| Your settings: refresh interval, whether the edge tab is shown, whether the inline menu is on and its trigger, whether search covers template content | To remember how you configured it |
| Which templates you used recently, and how many times each has been used | To put the ones you use most at the top of the list |
| Small pieces of interface state: which groups are collapsed, where you dragged the edge tab, and the URL of the tab you are currently viewing | So the extension behaves consistently as you move around GitHub, and so it can work out which sources apply to the page you are on |

The URL of the current tab is held only so the extension can decide which templates apply to the page. It is not recorded as history, not accumulated, and not sent anywhere.

Uninstalling the extension removes all of it.

## What is sent over the network

One thing: a request to the GitHub URL you configured as a template source, to read the templates from it.

That request is made by your browser using your existing GitHub session, which is why private repositories work if you can already read them. It goes to github.com and nowhere else.

There are no analytics, no telemetry, no crash reporting, no advertising, and no third-party services of any kind. The extension loads no remote code, scripts, stylesheets or fonts.

## What the extension can see

It runs only on `https://github.com/*`. On those pages it reads the comment box so it can insert a template where your cursor is, and adds its own entries to GitHub's saved replies list. It does not read, store or transmit the content of your comments, issues, pull requests or repositories.

## Why it asks for each permission

| Permission | Reason |
| --- | --- |
| `storage` | Keeps the items listed above in local browser storage |
| `alarms` | Re-fetches your template sources on the interval you set |
| `offscreen` | Parses the fetched GitHub page; the extension's background worker has no document to parse HTML with |
| `tabs` | Reads the current tab's URL to decide which sources apply to it |
| `webNavigation` | Notices GitHub's in-page navigation so the extension keeps working without a reload |
| `sidePanel` | Shows the templates in a side panel |
| `activeTab` | Access to the page you are actively using |
| `https://github.com/*` | The only site the extension runs on, and where your template file is fetched from |

## Changes

Any change to this policy will be committed to this repository, so its history is public.

## Contact

Questions or concerns: open an issue at https://github.com/dvdstelt/SharedSavedReplies/issues
