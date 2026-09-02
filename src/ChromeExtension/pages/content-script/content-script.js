
const isSidebarButtonEnabled = async () => {
    const settings = await getGlobalSettings();
    return settings.showEdgeTab;
};

const showHideSavedRepliesButton = async (showButton) => {

    if (!await isSidebarButtonEnabled()) return;

    var showSavedRepliesButton =
        document.querySelector(".team-saved-replies-edge-tab");

    if (showSavedRepliesButton === undefined || showSavedRepliesButton == null) {

        showSavedRepliesButton = createShowSavedRepliesButton();

        await addShowSavedRepliesClickHandler(showSavedRepliesButton);

        document.body.appendChild(showSavedRepliesButton);
    }

    if (showSavedRepliesButton !== undefined) {

        if (showButton !== undefined && showButton) {
            showSavedRepliesButton?.classList?.remove("hide");
        } else {
            showSavedRepliesButton?.classList?.add("hide");
        }
    }
}

const main = async () => {

    console.log("main called");

    const url = window.location.href;

    if (!shouldLoadContentScript(url)) {
        return;
    }

    if (!await isSidebarButtonEnabled()) return;

    const showSavedRepliesButton =
        document.querySelector(".team-saved-replies-edge-tab");

    if (showSavedRepliesButton === undefined || showSavedRepliesButton == null) {

        const showSavedRepliesButton = createShowSavedRepliesButton();

        await addShowSavedRepliesClickHandler(showSavedRepliesButton);

        document.body.appendChild(showSavedRepliesButton);
    }
}

chrome.runtime.onMessage.addListener(async (request, sender, sendResponse) => {
    handleCanLoadSavedRepliesChanged(request, (canLoadSavedReplies) => {
        showHideSavedRepliesButton(canLoadSavedReplies);
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