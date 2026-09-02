// Everything is edited against a working copy and committed on Save.
let workingSources = [];
const statusElements = new Map();
let workingSettings = { refreshRateInMinutes: DEFAULT_REFRESH_RATE_IN_MINUTES, showEdgeTab: true };

const stripGitHubPrefix = (value) =>
    value.replace(/^https?:\/\/github\.com\//i, ``).replace(/\/$/, ``);

const describeSyncStatus = (status) => {

    if (status === undefined) {
        return { text: `Not synced yet`, isError: false };
    }

    if (status.state === `syncing`) {
        return { text: `Syncing…`, isError: false };
    }

    if (status.state === `error`) {
        return { text: `Sync failed: ${status.message}`, isError: true };
    }

    if (status.state === `empty`) {
        return {
            text: `No templates found. The URL must be the GitHub page for the .md file.`,
            isError: true
        };
    }

    return {
        text: `${status.count} ${status.count === 1 ? `template` : `templates`}`,
        isError: false
    };
}

const paintSyncStatus = (sourceId, status) => {

    const element = statusElements.get(sourceId);

    if (element === undefined) {
        return;
    }

    const described = describeSyncStatus(status);

    element.textContent = described.text;

    element.className = `options-source-status${described.isError ? ` error` : ``}`;

    element.closest(`.options-source-header`)
        ?.classList?.toggle(`syncing`, status?.state === `syncing`);
}

const loadSyncStatuses = async () => {

    for (const source of workingSources) {

        paintSyncStatus(source.id, await getSyncStatusForSource(source.id));
    }
}

// Statuses land while the page is open, so they are painted in place rather than
// by re-rendering, which would throw away whatever is being typed.
chrome.storage.onChanged.addListener((changes) => {

    for (const [key, { newValue }] of Object.entries(changes)) {

        if (key.startsWith(`syncStatus:`)) {

            paintSyncStatus(key.slice(`syncStatus:`.length), newValue);
        }
    }
});

const createLabelledField = (labelText, control, helperText) => {

    const children = [
        createElement(`label`, { children: [labelText], className: `options-field-label` }),
        control
    ];

    if (helperText) {

        children.push(
            createElement(`div`, { children: [helperText], className: `options-helper` }));
    }

    return createElement(`div`, { children: children });
}

const createOnOffControl = (value, onChange) =>
    createSegmentedControl({
        options: [{ label: `On`, value: true }, { label: `Off`, value: false }],
        value: value,
        compact: true,
        onChange: onChange
    });

const createOwnerField = (source) => {

    const input = createElement(`input`, {
        className: `options-owner-input`,
        type: `text`,
        value: source.owner,
        placeholder: `[organization]`,
        "aria-label": `Organization or user`
    });

    // Pasting a full organization URL leaves just the name behind.
    input.addEventListener(`input`, (event) => {

        const stripped = stripGitHubPrefix(event.target.value);

        if (stripped !== event.target.value) {

            event.target.value = stripped;
        }

        source.owner = stripped;

        updateOwnerWarning(input, source);
    });

    return createElement(`div`, {
        children: [
            createElement(`span`, { children: [`https://github.com/`], className: `options-owner-prefix` }),
            input,
            createElement(`span`, { children: [`/`], className: `options-owner-suffix` })
        ],
        className: `options-owner-field`
    });
}

const updateOwnerWarning = (input, source) => {

    const block = input.closest(`.options-source-block`);

    const existing = block.querySelector(`.options-warning`);

    if (source.owner) {

        existing?.remove();

        return;
    }

    if (existing) {
        return;
    }

    block.append(createElement(`div`, {
        children: [`Without an organization or user this source will not show anywhere.`],
        className: `options-warning`
    }));
}

const createScopeBlock = (source) => {

    const scopeControl = createSegmentedControl({
        options: [
            { label: `All of GitHub`, value: `all` },
            { label: `One organization or user`, value: `orgs` }
        ],
        value: source.scope,
        compact: true,
        onChange: (value) => { source.scope = value; render(); }
    });

    const children = [
        createElement(`label`, {
            children: [`Where this source applies`],
            className: `options-field-label`
        }),
        scopeControl
    ];

    if (source.scope === `orgs`) {

        children.push(
            createElement(`div`, { children: [createOwnerField(source)], style: `margin-top: 14px` }),
            createElement(`div`, {
                children: [`Paste the full organization or user URL and the prefix is stripped for you.`],
                className: `options-helper`
            }));
    }

    const block = createElement(`div`, { children: children, className: `options-source-block` });

    if (source.scope === `orgs` && !source.owner) {

        block.append(createElement(`div`, {
            children: [`Without an organization or user this source will not show anywhere.`],
            className: `options-warning`
        }));
    }

    return block;
}

const createSourcePanel = (source, index) => {

    const nameInput = createElement(`input`, {
        className: `options-text-input`,
        type: `text`,
        value: source.name,
        placeholder: `Particular`,
        "aria-label": `Name`
    });

    const heading = createElement(`span`, {
        children: [source.name || `Untitled source`],
        className: `options-source-name`
    });

    nameInput.addEventListener(`input`, (event) => {

        source.name = event.target.value;

        heading.textContent = source.name || `Untitled source`;
    });

    const urlInput = createElement(`input`, {
        className: `options-text-input options-mono-input`,
        type: `text`,
        value: source.url,
        placeholder: `https://github.com/Particular/docs/blob/main/saved-replies.md`,
        "aria-label": `Templates URL`
    });

    urlInput.addEventListener(`input`, (event) => { source.url = event.target.value; });

    const status = createElement(`span`, { className: `options-source-status` });

    statusElements.set(source.id, status);

    const sync = createElement(`button`, {
        children: [`Sync`],
        className: `options-source-sync`,
        type: `button`,
        title: `Fetch this source's templates now`
    });

    // Syncs whatever is in the fields right now, so a URL can be checked before
    // it is saved. The status beside the name reports what came back.
    sync.addEventListener(`click`, async () => {

        sync.disabled = true;

        try {
            const command = createCommand(`RefreshSource`, SERVICE_WORKER, { source: { ...source } });

            const response = await chrome.runtime.sendMessage(command);

            if (response?.error) {

                paintSyncStatus(source.id, { state: `error`, message: response.error });
            }
        }
        catch (error) {

            paintSyncStatus(source.id, { state: `error`, message: error?.message ?? String(error) });
        }
        finally {

            sync.disabled = false;
        }
    });

    const remove = createElement(`button`, {
        children: [`Remove`],
        className: `options-source-remove`,
        type: `button`
    });

    remove.addEventListener(`click`, () => {

        workingSources = workingSources.filter((candidate) => candidate !== source);

        render();
    });

    return createElement(`div`, {
        children: [
            createElement(`div`, {
                children: [
                    createElement(`div`, {
                        children: [
                            createElement(`span`, {
                                children: [String(index + 1).padStart(2, `0`)],
                                className: `options-source-index`
                            }),
                            heading
                        ],
                        className: `options-source-heading`
                    }),
                    createElement(`div`, {
                        children: [status, sync, remove],
                        className: `options-source-heading`
                    })
                ],
                className: `options-source-header`
            }),
            createElement(`div`, {
                children: [
                    createElement(`div`, {
                        children: [
                            createLabelledField(`Name`, nameInput),
                            createLabelledField(`Templates URL`, urlInput,
                                `The GitHub page for the .md file, not the raw URL. Private repos work if you can read them.`)
                        ],
                        className: `options-source-identity`
                    }),
                    createScopeBlock(source),
                    createElement(`div`, {
                        children: [
                            createElement(`div`, {
                                children: [
                                    createLabelledField(`Applies to issues`,
                                        createOnOffControl(source.issues !== false,
                                            (value) => { source.issues = value; render(); })),
                                    createLabelledField(`Applies to pull requests`,
                                        createOnOffControl(source.prs !== false,
                                            (value) => { source.prs = value; render(); }))
                                ],
                                className: `options-applies-grid`
                            })
                        ],
                        className: `options-source-block`
                    })
                ],
                className: `options-source-body`
            })
        ],
        className: `options-source`
    });
}

const createGlobalStrip = () => {

    const refreshInput = createElement(`input`, {
        className: `options-number-input`,
        type: `number`,
        min: `1`,
        max: `1440`,
        value: String(workingSettings.refreshRateInMinutes),
        "aria-label": `Refresh rate in minutes`
    });

    refreshInput.addEventListener(`input`, (event) => {

        workingSettings.refreshRateInMinutes = event.target.value;
    });

    return createElement(`div`, {
        children: [
            createElement(`div`, { children: [`Global`], className: `options-section-label` }),
            createElement(`div`, {
                children: [
                    createLabelledField(`Refresh rate in minutes`, refreshInput,
                        `How often every source is re-fetched and cached. A refresh takes a few hundred milliseconds.`),
                    createLabelledField(`Show edge tab on GitHub`,
                        createOnOffControl(workingSettings.showEdgeTab,
                            (value) => { workingSettings.showEdgeTab = value; render(); }),
                        `Off still leaves the replies in GitHub's own saved-replies dialog and in the extension popup.`)
                ],
                className: `options-global-grid`
            })
        ],
        className: `options-global`
    });
}

const createActionBar = (lastSyncedAt) => {

    const save = createElement(`button`, {
        children: [`Save`],
        className: `options-button primary`,
        type: `button`
    });

    save.addEventListener(`click`, async () => {

        await saveSources(workingSources);

        await saveGlobalSettings(workingSettings);

        await load();
    });

    const cancel = createElement(`button`, {
        children: [`Cancel`],
        className: `options-button ghost`,
        type: `button`
    });

    cancel.addEventListener(`click`, async () => await load());

    return createElement(`div`, {
        children: [
            save,
            cancel,
            createElement(`div`, {
                children: [`Last ${describeMinutesSince(lastSyncedAt)}`],
                className: `options-last-sync`
            })
        ],
        className: `options-actions`
    });
}

let lastSyncedAt = null;

const render = () => {

    statusElements.clear();

    const root = document.getElementById(`options`);

    const addSource = createElement(`button`, {
        children: [createPlusIcon(), createElement(`span`, { children: [`Add source`] })],
        className: `options-add-source`,
        type: `button`
    });

    addSource.addEventListener(`click`, () => {

        workingSources.push(createEmptySource());

        render();
    });

    root.replaceChildren(
        createElement(`div`, {
            children: [
                createElement(`div`, {
                    children: [
                        createElement(`div`, {
                            children: [`Team Saved Replies`],
                            className: `options-kicker`
                        }),
                        createElement(`h1`, { children: [`Settings`], className: `options-title` })
                    ]
                }),
                createElement(`div`, {
                    children: [`v${chrome.runtime.getManifest().version}`],
                    className: `options-version`
                })
            ],
            className: `options-header`
        }),
        createGlobalStrip(),
        createElement(`div`, {
            children: [
                createElement(`div`, { children: [`Sources`], className: `options-section-label` }),
                createElement(`div`, {
                    children: [
                        `${workingSources.length} ${workingSources.length === 1 ? `source` : `sources`}`
                    ],
                    className: `options-sources-count`
                })
            ],
            className: `options-sources-head`
        }),
        ...workingSources.map(createSourcePanel),
        createElement(`div`, { children: [addSource], className: `options-add-source-row` }),
        createActionBar(lastSyncedAt));
}

const load = async () => {

    workingSources = (await getSources()).map((source) => ({ ...source }));

    workingSettings = await getGlobalSettings();

    lastSyncedAt = await getLastSyncedAt();

    render();

    await loadSyncStatuses();
}

load();
