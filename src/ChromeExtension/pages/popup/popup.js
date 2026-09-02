let groups = [];
let collapsedGroups = {};
let query = ``;

const describeHeaderSubline = () => {

    const templateCount = groups.reduce((total, group) => total + group.templates.length, 0);

    if (groups.length === 1) {

        return `${groups[0].source.name || `Untitled source`} · ${templateCount} templates`;
    }

    return `${groups.length} repos · ${templateCount} templates`;
}

const copyTemplate = async (template, label) => {

    try {

        await navigator.clipboard.writeText(template.body);

        flashRowLabel(label, `Copied`);

        await pushRecentlyUsed(template.id);
    }
    catch (error) {

        console.error(`Failed to copy: `, error);
    }
}

const toggleGroup = async (sourceId) => {

    collapsedGroups[sourceId] = !collapsedGroups[sourceId];

    await setGroupCollapsed(sourceId, collapsedGroups[sourceId]);

    renderList();
}

const renderList = () => {

    const list = document.querySelector(`.tsr-list`);

    list.replaceChildren();

    const matchingGroups = groups
        .map((group) => ({
            source: group.source,
            templates: group.templates.filter((template) => matchesTemplateQuery(template, query))
        }))
        .filter((group) => group.templates.length > 0 || !query);

    const anyMatches = matchingGroups.some((group) => group.templates.length > 0);

    if (query && !anyMatches) {

        list.append(createEmptyState(query));

        return;
    }

    // Always grouped, even with a single source: with one repo the header is
    // simply the line naming it.
    for (const group of matchingGroups) {

        const collapsed = collapsedGroups[group.source.id] === true;

        list.append(createGroupHeader({
            name: group.source.name || `Untitled source`,
            count: group.templates.length,
            collapsible: true,
            collapsed: collapsed,
            onToggle: () => toggleGroup(group.source.id)
        }));

        if (collapsed) {
            continue;
        }

        for (const template of group.templates) {

            list.append(createTemplateRow({
                template: template,
                onActivate: (activated, label) => copyTemplate(activated, label)
            }));
        }
    }
}

const renderEmptyPopup = (title, hint) =>
    createElement(`div`, {
        children: [
            createElement(`div`, { children: [title], className: `tsr-empty-title` }),
            createElement(`div`, { children: [hint], className: `tsr-empty-hint` })
        ],
        className: `tsr-empty`
    });

const initialize = async () => {

    const [tab] = await chrome.tabs.query({ active: true, lastFocusedWindow: true });

    groups = await getTemplateGroupsForUrl(tab?.url ?? ``);

    collapsedGroups = await getCollapsedGroups();

    const sources = await getSources();

    const popup = document.getElementById(`popup`);

    popup.append(
        createHeader({
            subline: describeHeaderSubline(),
            onOpenOptions: () => chrome.runtime.openOptionsPage()
        }),
        createSearchField({
            placeholder: `Filter templates`,
            onInput: (value) => { query = value; renderList(); }
        }),
        createElement(`div`, { className: `tsr-list` }),
        createElement(`div`, {
            children: [describeMinutesSince(await getLastSyncedAt())],
            className: `tsr-footer`
        }));

    if (groups.length === 0) {

        const list = document.querySelector(`.tsr-list`);

        list.append(sources.length === 0
            ? renderEmptyPopup(
                `No sources configured`,
                `Open settings with the gear above to add a templates file.`)
            : renderEmptyPopup(
                `Nothing applies to this page`,
                `Sources are scoped to an organization and to issues or pull requests.`));

        return;
    }

    renderList();
}

initialize();
