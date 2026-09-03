const EDGE_TAB_HEIGHT = 76;
const DEFAULT_EDGE_TAB_TOP_RATIO = 0.44;
const DRAG_THRESHOLD_IN_PIXELS = 3;

let savedRepliesVisible = false;

const clampEdgeTabTop = (top) =>
    Math.min(Math.max(top, 0), Math.max(0, window.innerHeight - EDGE_TAB_HEIGHT));

const describeEdgeTabSubline = async () => {

    const groups = await getTemplateGroupsForUrl(null);

    const templateCount = groups.reduce((total, group) => total + group.templates.length, 0);

    const templates = `${templateCount} ${templateCount === 1 ? `template` : `templates`}`;

    const shortcut = await getToggleShortcut();

    return shortcut ? `${templates} · ${shortcut}` : templates;
}

const getToggleShortcut = async () => {

    try {
        const commands = await chrome.commands.getAll();

        return commands.find((command) => command.name === `toggle-side-panel`)?.shortcut;
    }
    catch (error) {

        return undefined;
    }
}

const createShowSavedRepliesButton = () => {

    const iconUrl = chrome.runtime.getURL("pages/sidepanel/saved-replies-icon.svg");

    const icon = createElement("img", {
        className: "team-saved-replies-edge-icon",
        src: iconUrl,
        alt: ""
    });

    const label = createElement("span", {
        children: ["Saved replies"],
        className: "team-saved-replies-edge-label"
    });

    const subline = createElement("span", {
        className: "team-saved-replies-edge-subline"
    });

    const edgeTab = createElement("button", {
        children: [
            icon,
            createElement("div", {
                children: [label, subline],
                className: "team-saved-replies-edge-labels"
            })
        ],
        className: "team-saved-replies-edge-tab",
        type: "button",
        title: "Toggle the saved replies panel",
        "aria-label": "Toggle the saved replies panel"
    });

    describeEdgeTabSubline().then((text) => { subline.textContent = text; });

    getEdgeTabPosition().then((top) => {

        edgeTab.style.top =
            `${clampEdgeTabTop(top ?? window.innerHeight * DEFAULT_EDGE_TAB_TOP_RATIO)}px`;
    });

    addEdgeTabDragHandler(edgeTab);

    return edgeTab;
}

// Dragging and clicking share the same pointer, so a press only counts as a drag
// once it has moved far enough, and a drag suppresses the click that follows it.
const addEdgeTabDragHandler = (edgeTab) => {

    let dragging = false;
    let moved = false;
    let pointerOffsetY = 0;

    const onPointerMove = (event) => {

        if (!dragging) {
            return;
        }

        if (Math.abs(event.clientY - pointerOffsetY - edgeTab.offsetTop) > DRAG_THRESHOLD_IN_PIXELS) {
            moved = true;
        }

        if (moved) {

            edgeTab.classList.add("dragging");

            edgeTab.style.top = `${clampEdgeTabTop(event.clientY - pointerOffsetY)}px`;
        }
    }

    const onPointerUp = async () => {

        if (!dragging) {
            return;
        }

        dragging = false;

        edgeTab.classList.remove("dragging");

        window.removeEventListener("pointermove", onPointerMove);
        window.removeEventListener("pointerup", onPointerUp);

        if (moved) {

            await saveEdgeTabPosition(edgeTab.offsetTop);
        }
    }

    edgeTab.addEventListener("pointerdown", (event) => {

        dragging = true;
        moved = false;
        pointerOffsetY = event.clientY - edgeTab.offsetTop;

        window.addEventListener("pointermove", onPointerMove);
        window.addEventListener("pointerup", onPointerUp);
    });

    edgeTab.addEventListener("click", (event) => {

        if (moved) {

            event.preventDefault();
            event.stopImmediatePropagation();

            moved = false;
        }
    }, true);
}

const addShowSavedRepliesClickHandler = (showSavedRepliesButton) =>{
    
    showSavedRepliesButton.addEventListener(`click`, () =>{
    
        if(!savedRepliesVisible){
            const openSavedRepliesPanelMessage = "OpenTeamSavedRepliesPanel";

            const openTeamSavedRepliesPanelCommand = 
                createCommand(openSavedRepliesPanelMessage, SERVICE_WORKER, {});

            sendNonAsync(openTeamSavedRepliesPanelCommand);

            savedRepliesVisible = true;
        } else{
            const closeSavedRepliesPanelMessage = "CloseTeamSavedRepliesPanel";

            const closeTeamSavedRepliesPanelCommand = 
                createCommand(closeSavedRepliesPanelMessage, SIDE_PANEL, {});
    
            sendNonAsync(closeTeamSavedRepliesPanelCommand);  

            savedRepliesVisible = false;
        } 
    }) 
}
