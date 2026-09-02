const SOURCES_KEY = `sources`;
const SETTINGS_KEY = `settings`;
const RECENTLY_USED_KEY = `recentlyUsed`;
const COLLAPSED_GROUPS_KEY = `collapsedGroups`;
const EDGE_TAB_POSITION_KEY = `edgeTabPosition`;

const DEFAULT_REFRESH_RATE_IN_MINUTES = 30;
const RECENTLY_USED_LIMIT = 3;

const repliesKeyFor = (sourceId) => `replies:${sourceId}`;

const lastUpdatedKeyFor = (sourceId) => `lastUpdated:${sourceId}`;

const templateIdFor = (sourceId, replyName) => `${sourceId}::${replyName}`;

const getSources = async () => {

    const result = await chrome.storage.local.get([SOURCES_KEY]);

    const sources = result[SOURCES_KEY];

    return Array.isArray(sources) ? sources : [];
}

const getGlobalSettings = async () => {

    const result = await chrome.storage.local.get([SETTINGS_KEY]);

    const settings = result[SETTINGS_KEY] ?? {};

    return {
        refreshRateInMinutes:
            Number(settings.refreshRateInMinutes) || DEFAULT_REFRESH_RATE_IN_MINUTES,
        showEdgeTab: settings.showEdgeTab ?? true
    };
}

const getRepliesForSource = async (sourceId) => {

    const key = repliesKeyFor(sourceId);

    const result = await chrome.storage.local.get([key]);

    const replies = result[key];

    return Array.isArray(replies) ? replies : [];
}

const getLastUpdatedAtForSource = async (sourceId) => {

    const key = lastUpdatedKeyFor(sourceId);

    const result = await chrome.storage.local.get([key]);

    return result[key];
}

// A source only contributes templates when its scope and its issue / pull request
// flags both match the page being looked at, which is why two GitHub tabs can show
// different groups.
const getSourcesForUrl = async (url) => {

    const sources = await getSources();

    return sources.filter((source) => sourceAppliesToUrl(source, url));
}

// Grouped by source, for the popup and the side panel.
const getTemplateGroupsForUrl = async (url) => {

    const sources = await getSourcesForUrl(url);

    const groups = [];

    for (const source of sources) {

        const replies = await getRepliesForSource(source.id);

        groups.push({
            source: source,
            templates: replies.map((reply) => ({
                id: templateIdFor(source.id, reply.name),
                sourceId: source.id,
                sourceName: source.name,
                name: reply.name,
                body: reply.body
            }))
        });
    }

    return groups;
}

// Flat list, for the replies injected into GitHub's own saved replies dialog.
const getTemplatesForUrl = async (url) => {

    const groups = await getTemplateGroupsForUrl(url);

    return groups.flatMap((group) => group.templates);
}

const getLastSyncedAt = async () => {

    const sources = await getSources();

    let mostRecent = null;

    for (const source of sources) {

        const lastUpdatedAt = await getLastUpdatedAtForSource(source.id);

        if (lastUpdatedAt && (mostRecent === null || lastUpdatedAt > mostRecent)) {

            mostRecent = lastUpdatedAt;
        }
    }

    return mostRecent;
}
