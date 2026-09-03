# Security policy

## Supported versions

This is a single line of development. Only the most recent release gets fixes; there are no maintained older branches.

## Reporting a vulnerability

Please report privately rather than opening an issue, so it can be fixed before it is public.

Use **[Report a vulnerability](https://github.com/dvdstelt/SharedSavedReplies/security/advisories/new)** on the Security tab of this repository. That opens a private advisory visible only to you and the maintainers.

Expect an acknowledgement within a week. If it is a real issue you will get an estimate for the fix and credit in the advisory unless you would rather not be named. If it turns out not to be one, you will get an explanation of why.

## What is worth reporting

The extension runs a content script on github.com and fetches a markdown page the user configures, so the things most worth looking at are:

- Template content reaching the page as markup or script rather than as text.
- The configured source URL being used to reach somewhere other than the page the user pointed at.
- Anything that lets a page on github.com drive the extension, read what it has stored, or make it act on a source the user did not configure.
- Stored data becoming readable by the page.

The extension has no server and no account. It stores everything locally and sends nothing anywhere, so there is no backend to test. See [docs/privacy-policy.md](docs/privacy-policy.md) for exactly what it stores and the single request it makes.
