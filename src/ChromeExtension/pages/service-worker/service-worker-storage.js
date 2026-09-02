const getSourceById = async (sourceId) => {

    const sources = await getSources();

    return sources.find((source) => source.id === sourceId);
}

const saveRepliesInLocalStorage = async (sourceId, teamSavedReplies) => {

    if (isNullOrEmpty(teamSavedReplies)) {
        return;
    }

    await chrome.storage.local.set({
        [repliesKeyFor(sourceId)]: teamSavedReplies,
        [lastUpdatedKeyFor(sourceId)]: utcNowTicks()
    });
}

const removeDataFromLocalStorage = async (sourceId) => {

    await chrome.storage.local.remove([
        repliesKeyFor(sourceId),
        lastUpdatedKeyFor(sourceId)
    ]);
}

// Drops the cached replies of every source that is no longer configured.
const removeDataForDeletedSources = async (previousSources, currentSources) => {

    const currentIds = (currentSources ?? []).map((source) => source.id);

    for (const previous of previousSources ?? []) {

        if (!currentIds.includes(previous.id)) {

            console.log(`source ${previous.id} removed`);

            await removeDataFromLocalStorage(previous.id);
        }
    }
}
