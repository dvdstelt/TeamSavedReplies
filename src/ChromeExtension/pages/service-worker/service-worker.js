importScripts(["../../js/messaging.js"]);
importScripts(["../../js/message-receivers.js"]);
importScripts(["../../js/time.js"]);
importScripts(["../../js/null.js"]);
importScripts(["../../js/tabs.js"]);
importScripts(["../../js/elements.js"]);
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

const sendUpdateTeamSavedRepliesCommand = async (sourceId, url) => {

    const command =
        createCommand(`UpdateTeamSavedReplies`, OFFSCREEN, { sourceId: sourceId, url: url });

    await send(command);

    return true;
}

// Fetching runs in the offscreen document because the service worker has no DOM
// and the replies are parsed out of GitHub's rendered markdown page.
const refreshSource = async (source) => {

    if (isNullOrEmpty(source?.url)) {
        return;
    }

    await setupOffscreenDocument();

    await sendUpdateTeamSavedRepliesCommand(source.id, source.url);
}

const refreshAllSources = async () => {

    const sources = await getSources();

    for (const source of sources) {

        await refreshSource(source);
    }
}

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

        await removeDataForDeletedSources(oldValue, newValue);

        await refreshAllSources();
    }

    if (changes[SETTINGS_KEY]) {

        const { oldValue, newValue } = changes[SETTINGS_KEY];

        if (oldValue?.refreshRateInMinutes !== newValue?.refreshRateInMinutes) {

            await scheduleRefresh();
        }
    }
});

chrome.runtime.onMessage.addListener(async (request, sender, sendResponse) => {

    handleOpenTeamSavedRepliesPanel(request, () =>{  
        
        chrome.sidePanel.open({ tabId: activeTabId });
    });

    await handleSaveTeamSavedRepliesCommand(request, async (sourceId, replies) => {

        console.log(`saving replies for ${sourceId}.`);

        await saveRepliesInLocalStorage(sourceId, replies);
    });
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
