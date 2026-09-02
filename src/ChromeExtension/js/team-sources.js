const SOURCES_KEY = `sources`;
const SETTINGS_KEY = `settings`;
const RECENTLY_USED_KEY = `recentlyUsed`;
const COLLAPSED_GROUPS_KEY = `collapsedGroups`;
const EDGE_TAB_POSITION_KEY = `edgeTabPosition`;

const DEFAULT_REFRESH_RATE_IN_MINUTES = 30;
const RECENTLY_USED_LIMIT = 3;

const repliesKeyFor = (sourceId) => `replies:${sourceId}`;

const lastUpdatedKeyFor = (sourceId) => `lastUpdated:${sourceId}`;

const syncStatusKeyFor = (sourceId) => `syncStatus:${sourceId}`;

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

const createSourceId = () => `src-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

const createEmptySource = () => ({
    id: createSourceId(),
    name: ``,
    url: ``,
    scope: `all`,
    owner: ``,
    issues: true,
    prs: true
});

const saveSources = async (sources) => {

    await chrome.storage.local.set({ [SOURCES_KEY]: sources });
}

const saveGlobalSettings = async (settings) => {

    await chrome.storage.local.set({
        [SETTINGS_KEY]: {
            refreshRateInMinutes: Number(settings.refreshRateInMinutes) || DEFAULT_REFRESH_RATE_IN_MINUTES,
            showEdgeTab: settings.showEdgeTab ?? true
        }
    });
}

const getRecentlyUsed = async () => {

    const result = await chrome.storage.local.get([RECENTLY_USED_KEY]);

    const recentlyUsed = result[RECENTLY_USED_KEY];

    return Array.isArray(recentlyUsed) ? recentlyUsed : [];
}

// Most recent first, de-duplicated, capped. Maintained on copy; there is no
// favouriting UI.
const pushRecentlyUsed = async (templateId) => {

    const recentlyUsed = await getRecentlyUsed();

    const updated = [templateId, ...recentlyUsed.filter((id) => id !== templateId)]
        .slice(0, RECENTLY_USED_LIMIT);

    await chrome.storage.local.set({ [RECENTLY_USED_KEY]: updated });

    return updated;
}

const getCollapsedGroups = async () => {

    const result = await chrome.storage.local.get([COLLAPSED_GROUPS_KEY]);

    return result[COLLAPSED_GROUPS_KEY] ?? {};
}

const setGroupCollapsed = async (sourceId, collapsed) => {

    const collapsedGroups = await getCollapsedGroups();

    collapsedGroups[sourceId] = collapsed;

    await chrome.storage.local.set({ [COLLAPSED_GROUPS_KEY]: collapsedGroups });
}

const getEdgeTabPosition = async () => {

    const result = await chrome.storage.local.get([EDGE_TAB_POSITION_KEY]);

    return result[EDGE_TAB_POSITION_KEY];
}

const saveEdgeTabPosition = async (topInPixels) => {

    await chrome.storage.local.set({ [EDGE_TAB_POSITION_KEY]: topInPixels });
}

const getSyncStatusForSource = async (sourceId) => {

    const key = syncStatusKeyFor(sourceId);

    const result = await chrome.storage.local.get([key]);

    return result[key];
}

// Why a configured source contributes nothing to the page being looked at. The
// popup shows these so an empty list is explained rather than just empty.
const explainSourceMismatch = (source, url) => {

    const name = source.name || `Untitled source`;

    if (isNullOrEmpty(source.url)) {
        return `${name} has no templates URL set.`;
    }

    const isIssue = isGitHubIssueUrl(url);

    const isPullRequest = isGitHubPullRequestUrl(url);

    if (!isIssue && !isPullRequest) {
        return `This page is not a GitHub issue or pull request.`;
    }

    if (source.scope === `orgs`) {

        const owner = getGitHubOwner(url);

        if (!source.owner) {
            return `${name} is scoped to an organization, but none is set.`;
        }

        if (!owner || owner.localeCompare(source.owner, undefined, { sensitivity: `base` }) !== 0) {
            return `${name} only applies to ${source.owner}, this page is ${owner ?? `elsewhere`}.`;
        }
    }

    if (isIssue && !source.issues) {
        return `${name} is switched off for issues.`;
    }

    if (isPullRequest && !source.prs) {
        return `${name} is switched off for pull requests.`;
    }

    return undefined;
}

const saveTemplatesForSource = async (sourceId, replies) => {

    await chrome.storage.local.set({
        [repliesKeyFor(sourceId)]: replies,
        [lastUpdatedKeyFor(sourceId)]: utcNowTicks()
    });
}

const saveSyncStatusForSource = async (sourceId, status) => {

    await chrome.storage.local.set({ [syncStatusKeyFor(sourceId)]: status });
}
