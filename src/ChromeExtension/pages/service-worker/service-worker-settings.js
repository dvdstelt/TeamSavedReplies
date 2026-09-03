const getInitalSettings = () => {

    console.log(`initial settings`);

    return {
        refreshRateInMinutes: DEFAULT_REFRESH_RATE_IN_MINUTES,
        showEdgeTab: true
    }
}

const saveInitialSettings = async () => {

    const result = await chrome.storage.local.get([SETTINGS_KEY]);

    if (!isNullOrEmpty(result[SETTINGS_KEY])) {
        return;
    }

    await chrome.storage.local.set({ [SETTINGS_KEY]: getInitalSettings() });
}
