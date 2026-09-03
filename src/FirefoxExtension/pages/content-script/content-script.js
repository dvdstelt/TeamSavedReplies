
// Whether any source applies to the page being viewed. Remembered so the tab can
// be re-evaluated when the setting changes without losing this.
let canLoadSavedRepliesHere = true;

const isEdgeTabEnabled = async () => (await getGlobalSettings()).showEdgeTab;

const findEdgeTab = () => document.querySelector(".team-saved-replies-edge-tab");

const removeEdgeTab = () => findEdgeTab()?.remove();

const addEdgeTab = async () => {

    const edgeTab = createShowSavedRepliesButton();

    await addShowSavedRepliesClickHandler(edgeTab);

    document.body.appendChild(edgeTab);

    return edgeTab;
}

// Turning the setting off has to take away a tab that is already on the page,
// not merely stop the next one being added.
const applyEdgeTabVisibility = async () => {

    if (!await isEdgeTabEnabled() || !shouldLoadContentScript(window.location.href)) {

        removeEdgeTab();

        return;
    }

    const edgeTab = findEdgeTab() ?? await addEdgeTab();

    edgeTab.classList.toggle("hide", canLoadSavedRepliesHere === false);
}

const main = async () => await applyEdgeTabVisibility();

// The options page can toggle the tab while GitHub is open, so the setting is
// watched rather than only read once at page load.
chrome.storage.onChanged.addListener((changes) => {

    if (changes[SETTINGS_KEY]) {

        applyEdgeTabVisibility();
    }
});

chrome.runtime.onMessage.addListener(async (request, sender, sendResponse) => {
    handleCanLoadSavedRepliesChanged(request, (canLoadSavedReplies) => {
        canLoadSavedRepliesHere = canLoadSavedReplies;
        applyEdgeTabVisibility();
    });
});

// The side panel asks the page to take a template. Insertion is synchronous DOM
// work, so this responds immediately rather than returning a promise, which
// chrome.runtime.onMessage does not await.
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {

    if (!canHandleCommand(request, CONTENT_SCRIPT, "InsertTemplateIntoComment")) {
        return;
    }

    sendResponse({ inserted: insertReplyIntoTextarea(request.data.body) === true });
});

document.addEventListener("soft-nav:end", main);

main().catch((error) => {
    console.error("Oh no!", error);
});

observeSavedRepliesDialog();

startInlineTemplateMenu();