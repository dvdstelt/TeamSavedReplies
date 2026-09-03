const getCurrentTab = async () => {
    let queryOptions = { active: true, lastFocusedWindow: true };
    // `tab` will either be a `tabs.Tab` instance or `undefined`.
    let [tab] = await chrome.tabs.query(queryOptions);
    return tab;
  }

// Which source applies is decided against the page being looked at, so a surface
// that cannot work out that page silently shows nothing. From a popup or a side
// panel the extension's own window can be the last focused one, which is why
// currentWindow is asked first and there are fallbacks behind it.
const getActiveTabUrl = async () => {

    const queries = [
        { active: true, currentWindow: true },
        { active: true, lastFocusedWindow: true },
        { active: true }
    ];

    for (const queryOptions of queries) {

        try {
            const [tab] = await chrome.tabs.query(queryOptions);

            if (tab?.url) {
                return tab.url;
            }
        }
        catch (error) {

            console.log(`tab query failed`, error.message);
        }
    }

    return undefined;
}
