
import { fetchSavedRepliesFromUrl } from "../../js/modules/fetch-saved-replies.js";
import { canHandleUpdateTeamSavedRepliesCommand } from "./offscreen-messaging.js";

// The parsed replies are returned as the response to the command rather than
// pushed back as a second message, so the service worker knows whether the fetch
// actually succeeded and can report it.
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {

    if (!canHandleUpdateTeamSavedRepliesCommand(request)) {
        return;
    }

    fetchSavedRepliesFromUrl(request.data.url)
        .then((replies) => sendResponse({ replies: replies }))
        .catch((error) => {

            console.log("offscreen", error);

            sendResponse({ error: error?.message ?? String(error) });
        });

    // Literal true: anything else closes the port before the fetch resolves.
    return true;
});
