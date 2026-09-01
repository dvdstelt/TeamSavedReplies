## Chrome Developer Dashboard

[chrome developer dashboard](https://chrome.google.com/webstore/devconsole)

### Listing

This fork publishes to its own Chrome Web Store listing, separate from the upstream project. Create the listing once, then set the `EXTENSION_ID` repository variable to its ID so the release workflow can upload to it.

Open the listing from the developer dashboard and click the "upload new package" button, then add the zip file.

## firefox Add-on Developer Hub

[Developer Hub](https://addons.mozilla.org/en-US/developers/addons)

### Listing

This fork uses its own add-on ID (`browser_specific_settings.gecko.id` in `src/FirefoxExtension/manifest.json`), so it gets its own AMO listing. Create the listing once, then upload new versions from the Developer Hub.
