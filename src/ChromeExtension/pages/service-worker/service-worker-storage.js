const getSourceById = async (sourceId) => {

    const sources = await getSources();

    return sources.find((source) => source.id === sourceId);
}

const saveRepliesInLocalStorage = async (sourceId, teamSavedReplies) =>
    await saveTemplatesForSource(sourceId, teamSavedReplies);

// The options page reads this back so a source that fetched nothing, or failed,
// says so instead of just showing an empty list.
const saveSyncStatus = async (sourceId, status) =>
    await saveSyncStatusForSource(sourceId, status);

const removeDataFromLocalStorage = async (sourceId) => {

    await chrome.storage.local.remove([
        repliesKeyFor(sourceId),
        lastUpdatedKeyFor(sourceId),
        syncStatusKeyFor(sourceId)
    ]);
}

// Drops cached replies and status for any source id that is not configured any
// more. Diffing against the previous list would miss a source that was added and
// synced from the options page but never saved.
const removeOrphanedSourceData = async (currentSources) => {

    const currentIds = (currentSources ?? []).map((source) => source.id);

    const everything = await chrome.storage.local.get();

    const orphaned = Object.keys(everything).filter((key) => {

        const match = key.match(/^(?:replies|lastUpdated|syncStatus):(.+)$/);

        return match !== null && !currentIds.includes(match[1]);
    });

    if (orphaned.length > 0) {

        console.log(`dropping cached data for`, orphaned);

        await chrome.storage.local.remove(orphaned);
    }
}

// A source only needs re-fetching when what it points at changed. Renaming a
// source, or flipping its issue and pull request switches, does not.
const sourceNeedsRefresh = (previousSources, source) => {

    const previous = (previousSources ?? []).find((candidate) => candidate.id === source.id);

    return previous === undefined || previous.url !== source.url;
}
