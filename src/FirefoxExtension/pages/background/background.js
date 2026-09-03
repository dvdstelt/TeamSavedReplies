// Firefox's background is a page rather than a service worker, so it has a DOM
// and parses the fetched GitHub markup itself. Chrome has to hand that work to an
// offscreen document; here there is nothing to hand it to, and nothing to hand.

const REFRESH_ALARM = "refresh-sources";

let activeTabId;
let currentActiveTabUrl;

browser.menus.create({
    id: "team-saved-replies-toggle-sidebar",
    title: "Toggle saved replies",
    icons: { "16": "icons/icon16.png", "32": "icons/icon32.png" },
    command: "_execute_sidebar_action",
    contexts: ["editable"]
});

const tryPublishCanLoadSavedRepliesChangedEvent = async (tabId, url) => {

    const canLoadSavedReplies = await canLoadSavedRepliesForURL(url);

    await trySendMessageToContentScript(
        tabId, createCanLoadSavedRepliesChangedEvent(canLoadSavedReplies));
}

chrome.tabs.onActivated.addListener(async (activeInfo) => {

    activeTabId = activeInfo.tabId;

    const tab = await chrome.tabs.get(activeInfo.tabId);

    if (tab.active) {
        setCurrentActiveURL(tab.url);
    }
});

chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {

    if (tab.active && changeInfo.url !== undefined) {
        setCurrentActiveURL(tab.url);
    }
});

const refreshSource = async (source) => {

    if (isNullOrEmpty(source?.url)) {

        await saveSyncStatus(source.id, { state: `error`, message: `No templates URL set.` });

        return;
    }

    await saveSyncStatus(source.id, { state: `syncing` });

    try {
        const replies = await fetchSavedRepliesFromUrl(source.url);

        await saveRepliesInLocalStorage(source.id, replies);

        await saveSyncStatus(source.id, {
            state: replies.length === 0 ? `empty` : `ok`,
            count: replies.length
        });
    }
    catch (error) {

        console.log(`failed to refresh ${source.id}`, error);

        await saveSyncStatus(source.id, { state: `error`, message: error?.message ?? String(error) });
    }
}

// One source failing must not stop the rest from syncing.
const refreshSources = async (sources) => {

    for (const source of sources) {
        await refreshSource(source);
    }
}

const refreshAllSources = async () => await refreshSources(await getSources());

const scheduleRefresh = async () => {

    const settings = await getGlobalSettings();

    await createAlarm(REFRESH_ALARM, settings.refreshRateInMinutes);
}

chrome.runtime.onInstalled.addListener(async (details) => {

    if (details.reason !== "install" && details.reason !== "update") return;

    await saveInitialSettings();

    await scheduleRefresh();

    await refreshAllSources();
});

chrome.storage.onChanged.addListener(async (changes, area) => {

    if (changes[SOURCES_KEY]) {

        const { oldValue, newValue } = changes[SOURCES_KEY];

        await removeOrphanedSourceData(newValue);

        // Sync straight away when a source is added or repointed, so configuring
        // one shows its templates instead of waiting for the next alarm.
        await refreshSources((newValue ?? []).filter((source) => sourceNeedsRefresh(oldValue, source)));
    }

    if (changes[SETTINGS_KEY]) {

        const { oldValue, newValue } = changes[SETTINGS_KEY];

        if (oldValue?.refreshRateInMinutes !== newValue?.refreshRateInMinutes) {

            await scheduleRefresh();
        }
    }
});

// The edge tab asks for the panel. Firefox will only open a sidebar from a user
// gesture, and a runtime message may not carry one, so a failure here is expected
// rather than exceptional - the keyboard command and the context menu entry both
// still work.
chrome.runtime.onMessage.addListener((request) => {

    if (canHandleCommand(request, SERVICE_WORKER, `OpenTeamSavedRepliesPanel`)) {

        try {
            browser.sidebarAction.toggle();
        }
        catch (error) {

            console.log(`could not toggle the sidebar without a user gesture`, error);
        }
    }
});

onAlarm(async () => await refreshAllSources());

chrome.webNavigation.onHistoryStateUpdated.addListener(async (details) => {

    if (currentActiveTabUrl !== details.url) {

        tryPublishCanLoadSavedRepliesChangedEvent(details.tabId, details.url);
    }

    currentActiveTabUrl = details.url;

}, { url: [{ hostSuffix: 'github.com' }] });
