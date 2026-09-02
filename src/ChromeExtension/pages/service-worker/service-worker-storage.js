const getSourceById = async (sourceId) => {

    const sources = await getSources();

    return sources.find((source) => source.id === sourceId);
}

const saveRepliesInLocalStorage = async (sourceId, teamSavedReplies) => {

    await chrome.storage.local.set({
        [repliesKeyFor(sourceId)]: teamSavedReplies,
        [lastUpdatedKeyFor(sourceId)]: utcNowTicks()
    });
}

// The options page reads this back so a source that fetched nothing, or failed,
// says so instead of just showing an empty list.
const saveSyncStatus = async (sourceId, status) => {

    await chrome.storage.local.set({ [syncStatusKeyFor(sourceId)]: status });
}

const removeDataFromLocalStorage = async (sourceId) => {

    await chrome.storage.local.remove([
        repliesKeyFor(sourceId),
        lastUpdatedKeyFor(sourceId),
        syncStatusKeyFor(sourceId)
    ]);
}

const removeDataForDeletedSources = async (previousSources, currentSources) => {

    const currentIds = (currentSources ?? []).map((source) => source.id);

    for (const previous of previousSources ?? []) {

        if (!currentIds.includes(previous.id)) {

            console.log(`source ${previous.id} removed`);

            await removeDataFromLocalStorage(previous.id);
        }
    }
}

// A source only needs re-fetching when what it points at changed. Renaming a
// source, or flipping its issue and pull request switches, does not.
const sourceNeedsRefresh = (previousSources, source) => {

    const previous = (previousSources ?? []).find((candidate) => candidate.id === source.id);

    return previous === undefined || previous.url !== source.url;
}
