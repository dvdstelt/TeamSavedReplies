let groups = [];
let activeTabUrl;
let recentlyUsedIds = [];
let query = ``;

const allTemplates = () => groups.flatMap((group) => group.templates);

const recentlyUsedTemplates = () =>
    recentlyUsedIds
        .map((id) => allTemplates().find((template) => template.id === id))
        .filter((template) => template !== undefined);

// A row means one thing: hand the template to the page if it can take it,
// otherwise put it on the clipboard.
const applyTemplate = async (template, label) => {

    let inserted = false;

    const [tab] = await chrome.tabs.query({ active: true, lastFocusedWindow: true });

    if (tab?.id !== undefined) {

        try {
            const command =
                createCommand(`InsertTemplateIntoComment`, CONTENT_SCRIPT, { body: template.body });

            const response = await chrome.tabs.sendMessage(tab.id, command);

            inserted = response?.inserted === true;
        }
        catch (error) {

            console.log(`could not insert into the page`, error.message);
        }
    }

    if (!inserted) {

        try {
            await navigator.clipboard.writeText(template.body);
        }
        catch (error) {

            console.error(`Failed to copy: `, error);

            return;
        }
    }

    flashRowLabel(label, inserted ? `Inserted` : `Copied`);

    recentlyUsedIds = await pushRecentlyUsed(template.id);

    // Re-rendering now would replace the row that is still showing its label, so
    // the Recently used section is refreshed once the label has run its course.
    setTimeout(renderList, ROW_LABEL_DURATION_IN_MS);
}

const createSectionHeader = (name, note) =>
    createElement(`div`, {
        children: [
            createElement(`span`, { children: [name], className: `tsr-section-name` }),
            createElement(`span`, { children: [note], className: `tsr-section-note` })
        ],
        className: `tsr-section-header`
    });

const renderList = () => {

    const list = document.querySelector(`.tsr-list`);

    list.replaceChildren();

    const matchingGroups = groups.map((group) => ({
        source: group.source,
        templates: group.templates.filter((template) => matchesTemplateQuery(template, query))
    }));

    if (query && !matchingGroups.some((group) => group.templates.length > 0)) {

        list.append(createEmptyState(query));

        return;
    }

    // Recency crosses repos, so those rows carry a badge - but only when there is
    // more than one source to tell apart.
    const showBadges = groups.length > 1;

    const recent = recentlyUsedTemplates();

    if (!query && recent.length > 0) {

        list.append(createSectionHeader(`Recently used`, `Automatic`));

        for (const template of recent) {

            list.append(createTemplateRow({
                template: template,
                badge: showBadges ? template.sourceName : undefined,
                onActivate: applyTemplate
            }));
        }
    }

    for (const group of matchingGroups) {

        if (query && group.templates.length === 0) {
            continue;
        }

        list.append(createGroupHeader({
            name: group.source.name || `Untitled source`,
            count: group.templates.length,
            collapsible: false
        }));

        for (const template of group.templates) {

            list.append(createTemplateRow({ template: template, onActivate: applyTemplate }));
        }
    }
}

const closePanelIfRepliesCannotLoad = async (url) => {

    const canLoadReplies = await canLoadSavedRepliesForURL(url);

    if (!canLoadReplies && window !== undefined) {

        window.close();
    }
}

chrome.runtime.onMessage.addListener(async (request, sender, sendResponse) => {

    handleCloseTeamSavedRepliesPanel(request, () => {

        if (window !== undefined) {

            window.close();
        }
    });
});

chrome.tabs.onActivated.addListener(async (activeInfo) => {

    const tab = await chrome.tabs.get(activeInfo.tabId);

    if (tab.active) {

        await closePanelIfRepliesCannotLoad(tab.url);
    }
});

chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {

    if (tab.active) {

        await closePanelIfRepliesCannotLoad(tab.url);
    }
});

const initialize = async () => {

    activeTabUrl = await getActiveTabUrl();

    groups = await getTemplateGroupsForUrl(activeTabUrl ?? ``);

    recentlyUsedIds = await getRecentlyUsed();

    const panel = document.getElementById(`TeamSavedReplies`);

    panel.append(
        createHeader({ onOpenOptions: () => chrome.runtime.openOptionsPage() }),
        createSearchField({
            placeholder: `Filter name or body`,
            onInput: (value) => { query = value; renderList(); }
        }),
        createElement(`div`, { className: `tsr-list` }));

    renderList();
}

document.onreadystatechange = () => {

    if (document.readyState === `complete`) {

        initialize();
    }
}
