importScripts(["../../js/messaging.js"]);
importScripts(["../../js/message-receivers.js"]);
importScripts(["../../js/time.js"]);
importScripts(["../../js/null.js"]);
importScripts(["../../js/tabs.js"]);
importScripts(["../../js/urls.js"]);
importScripts(["../../js/team-sources.js"]);
importScripts(["../../js/events.js"]);
importScripts(["../../js/can-load-saved-replies.js"])
importScripts(["offscreen-document.js"]);
importScripts(["service-worker-messaging.js"]);
importScripts(["service-worker-storage.js"]);
importScripts(["service-worker-alarms.js"]);
importScripts(["service-worker-settings.js"]);

const OFFSCREEN = "offscreen";

const REFRESH_ALARM = "refresh-sources";

//set the activeTabId
let activeTabId;
let currentActiveTabUrl;

setInterval(chrome.runtime.getPlatformInfo, 25e3);

chrome.runtime.onStartup.addListener(async () => {
    activeTabId = (await chrome.tabs.query({ active: true, currentWindow: true }))[0]?.id;
});

const tryPublishCanLoadSavedRepliesChangedEvent = async (tabId, url) =>{

    const canLoadSavedReplies = await canLoadSavedRepliesForURL(url);

    const canLoadSavedRepliesChangedEvent = 
        createCanLoadSavedRepliesChangedEvent(canLoadSavedReplies);

    await trySendMessageToContentScript(tabId, canLoadSavedRepliesChangedEvent);
}

chrome.tabs.onActivated.addListener(async (activeInfo) => {
    
    activeTabId = activeInfo.tabId;

    const tab = await chrome.tabs.get(activeInfo.tabId);
    if (tab.active) {
       
      setCurrentActiveURL(tab.url);

    }
});

//update current url for updated tab when url in a tab changes
chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
    if (tab.active) {
        
        if(changeInfo.url !== undefined){
            setCurrentActiveURL(tab.url);
        }
    }
});

const delay = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds));

// A freshly created offscreen document does not always have its message listener
// registered by the time createDocument resolves, and the first send is then lost.
// Retrying briefly is what makes a sync on first configure actually land.
const sendToOffscreenDocument = async (command, attempts = 5) => {

    for (let attempt = 1; attempt <= attempts; attempt++) {

        try {
            return await chrome.runtime.sendMessage(command);
        }
        catch (error) {

            if (attempt === attempts) {
                throw error;
            }

            console.log(`offscreen not ready, retrying`, error.message);

            await delay(100 * attempt);
        }
    }
}

// Fetching runs in the offscreen document because the service worker has no DOM
// and the replies are parsed out of GitHub's rendered markdown page.
const refreshSource = async (source) => {

    if (isNullOrEmpty(source?.url)) {

        await saveSyncStatus(source.id, { state: `error`, message: `No templates URL set.` });

        return;
    }

    await saveSyncStatus(source.id, { state: `syncing` });

    try {
        await setupOffscreenDocument();

        const command =
            createCommand(`UpdateTeamSavedReplies`, OFFSCREEN, { sourceId: source.id, url: source.url });

        const response = await sendToOffscreenDocument(command);

        if (response?.error) {

            await saveSyncStatus(source.id, { state: `error`, message: response.error });

            return;
        }

        const replies = response?.replies ?? [];

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

// One alarm for every source: the refresh rate is a global setting now.
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
        const needRefresh =
            (newValue ?? []).filter((source) => sourceNeedsRefresh(oldValue, source));

        await refreshSources(needRefresh);
    }

    if (changes[SETTINGS_KEY]) {

        const { oldValue, newValue } = changes[SETTINGS_KEY];

        if (oldValue?.refreshRateInMinutes !== newValue?.refreshRateInMinutes) {

            await scheduleRefresh();
        }
    }
});

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {

    handleOpenTeamSavedRepliesPanel(request, () => {

        chrome.sidePanel.open({ tabId: activeTabId });
    });
});

chrome.commands.onCommand.addListener((command) => {

    if (command === `toggle-side-panel`) {

        chrome.sidePanel.open({ tabId: activeTabId });
    }
});

onAlarm(async () => await refreshAllSources());

chrome.webNavigation.onHistoryStateUpdated.addListener( 
    async (details) =>  {

        //This seems to force the content-script to be reloaded.
        const getCurrentTab = async () => {
            let queryOptions = { active: true, lastFocusedWindow: true };     
            let [tab] = await chrome.tabs.query(queryOptions);
            return tab;
        }
        let tab = await getCurrentTab();

        if(currentActiveTabUrl != details.url){
            tryPublishCanLoadSavedRepliesChangedEvent(details.tabId, details.url);
        }

        currentActiveTabUrl = details.url;

}, {url: [{hostSuffix: 'github.com'}]});
