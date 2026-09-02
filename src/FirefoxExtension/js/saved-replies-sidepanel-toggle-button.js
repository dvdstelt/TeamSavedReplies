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
        children: ["Ctrl+Shift+Y"],
        className: "team-saved-replies-edge-subline"
    });

    return createElement("button", {
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
}
