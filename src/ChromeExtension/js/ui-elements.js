const SVG_NAMESPACE = "http://www.w3.org/2000/svg";

// Icon path data is lifted from the extension's existing artwork so the redesign
// introduces no new icons.
const SEARCH_ICON_PATH = "M15.6092 13.7282L12.5125 10.6315C13.4554 9.22007 13.8396 7.50839 13.5903 5.82939C13.341 4.1504 12.4762 2.62414 11.1639 1.54751C9.85167 0.470872 8.18586 -0.0791649 6.49052 0.00438852C4.79518 0.087942 3.19153 0.799111 1.99151 1.99956C0.791479 3.20002 0.0808763 4.80392 -0.00207777 6.49928C-0.0850318 8.19465 0.465594 9.86026 1.54269 11.1721C2.61979 12.484 4.14635 13.3483 5.82544 13.597C7.50452 13.8457 9.21607 13.4609 10.6272 12.5175L13.7238 15.6135C13.976 15.8595 14.3143 15.9971 14.6665 15.9971C15.0187 15.9971 15.357 15.8595 15.6092 15.6135C15.8591 15.3635 15.9995 15.0244 15.9995 14.6708C15.9995 14.3173 15.8591 13.9782 15.6092 13.7282ZM6.83316 2.00416C7.7891 2.00416 8.72358 2.28763 9.51842 2.81873C10.3133 3.34982 10.9328 4.10468 11.2986 4.98786C11.6644 5.87104 11.7601 6.84286 11.5736 7.78043C11.3871 8.71801 10.9268 9.57922 10.2508 10.2552C9.57489 10.9311 8.71367 11.3915 7.7761 11.578C6.83852 11.7645 5.8667 11.6687 4.98352 11.3029C4.10035 10.9371 3.34548 10.3176 2.81439 9.52275C2.2833 8.72791 1.99983 7.79344 1.99983 6.8375C2.00124 5.55605 2.51091 4.32749 3.41703 3.42137C4.32315 2.51525 5.55171 2.00557 6.83316 2.00416Z";

const COPY_ICON_PATH = "M 4 2 C 2.895 2 2 2.895 2 4 L 2 17 C 2 17.552 2.448 18 3 18 C 3.552 18 4 17.552 4 17 L 4 4 L 17 4 C 17.552 4 18 3.552 18 3 C 18 2.448 17.552 2 17 2 L 4 2 z M 8 6 C 6.895 6 6 6.895 6 8 L 6 20 C 6 21.105 6.895 22 8 22 L 20 22 C 21.105 22 22 21.105 22 20 L 22 8 C 22 6.895 21.105 6 20 6 L 8 6 z M 8 8 L 20 8 L 20 20 L 8 20 L 8 8 z";

const CHEVRON_ICON_PATH = "M325.607,79.393c-5.857-5.857-15.355-5.858-21.213,0.001l-139.39,139.393L25.607,79.393c-5.857-5.857-15.355-5.858-21.213,0.001c-5.858,5.858-5.858,15.355,0,21.213l150.004,150c2.813,2.813,6.628,4.393,10.606,4.393s7.794-1.581,10.606-4.394l149.996-150C331.465,94.749,331.465,85.251,325.607,79.393z";

const PLUS_ICON_PATH = "M0 10C0 10.3315 0.131696 10.6495 0.366116 10.8839C0.600537 11.1183 0.918479 11.25 1.25 11.25H8.54167C8.59692 11.25 8.64991 11.2719 8.68898 11.311C8.72805 11.3501 8.75 11.4031 8.75 11.4583V18.75C8.75 19.0815 8.8817 19.3995 9.11612 19.6339C9.35054 19.8683 9.66848 20 10 20C10.3315 20 10.6495 19.8683 10.8839 19.6339C11.1183 19.3995 11.25 19.0815 11.25 18.75V11.4583C11.25 11.4031 11.2719 11.3501 11.311 11.311C11.3501 11.2719 11.4031 11.25 11.4583 11.25H18.75C19.0815 11.25 19.3995 11.1183 19.6339 10.8839C19.8683 10.6495 20 10.3315 20 10C20 9.66848 19.8683 9.35054 19.6339 9.11612C19.3995 8.8817 19.0815 8.75 18.75 8.75H11.4583C11.4031 8.75 11.3501 8.72805 11.311 8.68898C11.2719 8.64991 11.25 8.59692 11.25 8.54167V1.25C11.25 0.918479 11.1183 0.600537 10.8839 0.366116C10.6495 0.131696 10.3315 0 10 0C9.66848 0 9.35054 0.131696 9.11612 0.366116C8.8817 0.600537 8.75 0.918479 8.75 1.25V8.54167C8.75 8.59692 8.72805 8.64991 8.68898 8.68898C8.64991 8.72805 8.59692 8.75 8.54167 8.75H1.25C0.918479 8.75 0.600537 8.8817 0.366116 9.11612C0.131696 9.35054 0 9.66848 0 10H0Z";

const GEAR_ICON_PATHS = [
    "M35.367,26.428c-4.687,0-8.5,3.813-8.5,8.5s3.813,8.5,8.5,8.5s8.5-3.813,8.5-8.5S40.054,26.428,35.367,26.428z M35.367,41.428c-3.59,0-6.5-2.91-6.5-6.5s2.91-6.5,6.5-6.5s6.5,2.91,6.5,6.5S38.957,41.428,35.367,41.428z",
    "M43.917,21.998c-0.461-0.306-1.082-0.18-1.386,0.282c-0.305,0.46-0.179,1.08,0.282,1.386 c3.79,2.511,6.054,6.721,6.054,11.262c0,0.553,0.447,1,1,1s1-0.447,1-1C50.867,29.714,48.27,24.881,43.917,21.998z",
    "M35.367,21.428c0.94,0,1.88,0.098,2.795,0.289c0.069,0.015,0.138,0.021,0.206,0.021c0.463,0,0.879-0.323,0.978-0.795 c0.113-0.54-0.232-1.07-0.773-1.184c-1.049-0.221-2.127-0.332-3.205-0.332c-0.553,0-1,0.447-1,1S34.814,21.428,35.367,21.428z",
    "M64.219,27.583h-6.266c-0.468-1-1.1-2.556-1.882-4.001l2.424-2.151c1.563-1.563,1.563-3.958,0.001-5.521l-3.896-3.827 c-0.75-0.75-1.768-1.139-2.829-1.139s-2.079,0.439-2.829,1.189l-2.617,2.434c-1.445-0.783-3.742-1.405-4.742-1.874V7.428 c0-2.209-1.401-4.845-3.61-4.845h-6.508c-2.209,0-3.882,1.636-3.882,3.845v6.266c-2,0.469-2.659,1.1-4.104,1.883l-2.205-2.426 c-0.75-0.75-1.657-1.172-2.718-1.172c-1.061,0-2.023,0.422-2.774,1.172l-3.868,3.896c-1.563,1.563-1.548,4.095,0.015,5.657 l2.431,1.878c-0.782,1.445-1.407,3.001-1.875,4.001H6.219c-2.209,0-3.636,1.882-3.636,4.091v6.507c0,2.209,2.427,3.402,4.636,3.402 h5.265c0.469,1,1.101,3.402,1.883,4.846l-2.424,2.574c-1.563,1.561-1.563,4.169-0.001,5.731l3.896,3.933 c0.75,0.75,1.768,1.192,2.829,1.192s2.079-0.414,2.829-1.164l1.984-2.42c1.445,0.783,2.104,1.418,4.104,1.887v5.266 c0,2.209,2.673,3.155,4.882,3.155h5.508c2.209,0,3.61-0.946,3.61-3.155v-5.266c1-0.469,3.297-1.1,4.742-1.883l2.52,2.426 c0.75,0.75,1.817,1.172,2.879,1.172c1.061,0,2.101-0.422,2.852-1.172l3.909-3.896c1.562-1.563,1.566-4.095,0.004-5.656 l-2.419-2.724c0.782-1.443,1.416-3.846,1.885-4.846h5.265c2.209,0,3.364-1.193,3.364-3.402v-5.507 C66.583,30.465,66.428,27.583,64.219,27.583z M62.583,37.583h-7.841c-0.455,3-1.71,6.674-3.771,9.404l4.695,4.844l-3.896,3.972 l-4.89-4.661c-2.732,2.062-6.299,3.354-9.299,3.81v7.632h-6v-7.632c-3-0.455-5.93-1.71-8.663-3.771l-4.475,4.697L14.66,51.98 l4.75-4.993c-2.061-2.73-3.26-6.404-3.715-9.404H6.583v-6h9.112c0.455-3,1.71-5.827,3.771-8.56l-4.695-4.422l3.896-3.76 l4.254,4.767c2.732-2.062,5.663-3.249,8.663-3.704V6.583h6v9.321c3,0.455,6.566,1.71,9.299,3.771l4.792-4.697l3.945,3.896 l-4.673,4.148c2.061,2.732,3.341,5.56,3.796,8.56h7.841V37.583z",
    "M28.421,45.689c-3.79-2.511-6.054-6.721-6.054-11.262c0-0.553-0.447-1-1-1s-1,0.447-1,1c0,5.214,2.598,10.047,6.95,12.93 c0.17,0.112,0.361,0.166,0.551,0.166c0.324,0,0.643-0.157,0.835-0.448C29.008,46.615,28.882,45.995,28.421,45.689z"
];

const createSvgIcon = (pathData, { viewBox, size, fill, className } = {}) => {

    const pathList = Array.isArray(pathData) ? pathData : [pathData];

    const svg = document.createElementNS(SVG_NAMESPACE, "svg");

    svg.setAttribute("viewBox", viewBox);
    svg.setAttribute("width", size);
    svg.setAttribute("height", size);
    svg.setAttribute("aria-hidden", "true");
    svg.setAttribute("focusable", "false");

    if (className) {
        svg.setAttribute("class", className);
    }

    for (const pathData of pathList) {

        const path = document.createElementNS(SVG_NAMESPACE, "path");

        path.setAttribute("d", pathData);
        path.setAttribute("fill", fill);

        svg.appendChild(path);
    }

    return svg;
}

const createSearchIcon = () =>
    createSvgIcon(SEARCH_ICON_PATH,
        { viewBox: "0 0 16 16", size: 14, fill: "#7d7979", className: "tsr-search-icon" });

const createCopyGlyph = () =>
    createSvgIcon(COPY_ICON_PATH,
        { viewBox: "0 0 24 24", size: 14, fill: "#9b9797", className: "tsr-row-copy-glyph" });

const createChevronIcon = () =>
    createSvgIcon(CHEVRON_ICON_PATH,
        { viewBox: "0 0 330 330", size: 9, fill: "#201e1d", className: "tsr-group-chevron" });

const createPlusIcon = (fill) =>
    createSvgIcon(PLUS_ICON_PATH, { viewBox: "0 0 20 20", size: 12, fill: fill ?? "#201e1d" });

const createGearIcon = () =>
    createSvgIcon(GEAR_ICON_PATHS, { viewBox: "0 0 70 70", size: 18, fill: "currentColor" });

const createHeader = ({ subline, onOpenOptions }) => {

    const titles = [
        createElement("span", { children: ["Saved replies"], className: "tsr-header-title" })
    ];

    if (subline !== undefined) {

        titles.push(
            createElement("span", { children: [subline], className: "tsr-header-subline" }));
    }

    const gear = createElement("button", {
        children: [createGearIcon()],
        className: "tsr-icon-button",
        type: "button",
        title: "Open settings",
        "aria-label": "Open settings"
    });

    gear.addEventListener("click", onOpenOptions);

    return createElement("div", {
        children: [
            createElement("div", { children: titles, className: "tsr-header-titles" }),
            gear
        ],
        className: "tsr-header"
    });
}

const createSearchField = ({ placeholder, onInput, option }) => {

    const input = createElement("input", {
        className: "tsr-search-input",
        type: "text",
        placeholder: placeholder,
        "aria-label": placeholder
    });

    input.addEventListener("input", (event) => onInput(event.target.value));

    const children = [
        createElement("div", {
            children: [createSearchIcon(), input],
            className: "tsr-search-field"
        })
    ];

    if (option) {

        const checkbox = createElement("input", {
            className: "tsr-search-checkbox",
            type: "checkbox",
            id: "tsr-search-option"
        });

        checkbox.checked = option.checked === true;

        checkbox.addEventListener("change", (event) => option.onToggle(event.target.checked));

        children.push(createElement("label", {
            children: [
                checkbox,
                createElement("span", {
                    children: [option.label],
                    className: "tsr-search-option-label"
                })
            ],
            className: "tsr-search-option",
            for: "tsr-search-option"
        }));
    }

    return createElement("div", { children: children, className: "tsr-search" });
}

// The placeholder says what the filter currently covers, so a checked box is
// never contradicted by the field beside it.
const describeSearchPlaceholder = (searchInsideContent) =>
    searchInsideContent ? "Filter names and content" : "Filter template names";

const setSearchPlaceholder = (searchInsideContent) => {

    const input = document.querySelector(".tsr-search-input");

    if (input) {

        input.placeholder = describeSearchPlaceholder(searchInsideContent);
        input.setAttribute("aria-label", input.placeholder);
    }
}

const createGroupHeader = ({ name, count, collapsible, collapsed, onToggle }) => {

    const children = [];

    if (collapsible) {
        children.push(createChevronIcon());
    }

    children.push(
        createElement("span", { children: [name], className: "tsr-group-name" }),
        createElement("span", {
            children: [`${count} ${count === 1 ? "template" : "templates"}`],
            className: "tsr-group-count"
        }));

    const classNames = ["tsr-group-header"];

    if (collapsible) {
        classNames.push("clickable");
    }

    if (collapsed) {
        classNames.push("collapsed");
    }

    const header = createElement(collapsible ? "button" : "div", {
        children: children,
        className: classNames.join(" "),
        type: collapsible ? "button" : undefined
    });

    if (collapsible) {

        header.setAttribute("aria-expanded", String(!collapsed));

        header.addEventListener("click", () => onToggle());
    }

    return header;
}

// The whole row is the target. The copy glyph is decorative and carries no
// handler of its own.
const createTemplateRow = ({ template, badge, onActivate }) => {

    const children = [
        createElement("span", { children: [template.name], className: "tsr-row-name" })
    ];

    if (badge) {

        children.push(
            createElement("span", { children: [badge], className: "tsr-row-badge" }));
    }

    const doneLabel = createElement("span", { className: "tsr-row-done" });

    children.push(doneLabel, createCopyGlyph());

    const row = createElement("button", {
        children: children,
        className: "tsr-row",
        type: "button",
        title: "Click to copy to clipboard"
    });

    row.addEventListener("click", () => onActivate(template, doneLabel));

    return row;
}

const createEmptyState = (query, searchInsideContent) =>
    createElement("div", {
        children: [
            createElement("div", {
                children: [`Nothing matches "${query}"`],
                className: "tsr-empty-title"
            }),
            createElement("div", {
                children: [searchInsideContent
                    ? "Filtering runs over template names and content."
                    : "Filtering runs over template names. Tick the box above to include content."],
                className: "tsr-empty-hint"
            })
        ],
        className: "tsr-empty"
    });

const createSegmentedControl = ({ options, value, compact, onChange }) => {

    const buttons = options.map((option) =>
        createElement("button", {
            children: [option.label],
            className: `tsr-segmented-option${option.value === value ? " selected" : ""}`,
            type: "button"
        }));

    const wrapper = createElement("div", {
        children: buttons,
        className: `tsr-segmented${compact ? " compact" : ""}`,
        role: "group"
    });

    buttons.forEach((button, index) => {

        button.setAttribute("aria-pressed", String(options[index].value === value));

        button.addEventListener("click", () => onChange(options[index].value));
    });

    return wrapper;
}

const matchesTemplateQuery = (template, query, searchInsideContent) => {

    if (!query) {
        return true;
    }

    const needle = query.toLowerCase();

    if (template.name.toLowerCase().includes(needle)) {
        return true;
    }

    return searchInsideContent === true
        && (template.body ?? "").toLowerCase().includes(needle);
}

const TICKS_EPOCH_OFFSET = 621355968000000000;
const TICKS_PER_MILLISECOND = 10000;

const describeMinutesSince = (ticks) => {

    if (!ticks) {
        return "never synced";
    }

    const milliseconds = (ticks - TICKS_EPOCH_OFFSET) / TICKS_PER_MILLISECOND;

    const minutes = Math.max(0, Math.floor((Date.now() - milliseconds) / 60000));

    if (minutes < 1) {
        return "synced just now";
    }

    if (minutes === 1) {
        return "synced 1 min ago";
    }

    if (minutes < 60) {
        return `synced ${minutes} min ago`;
    }

    const hours = Math.floor(minutes / 60);

    return `synced ${hours} ${hours === 1 ? "hour" : "hours"} ago`;
}

const ROW_LABEL_DURATION_IN_MS = 1500;

const flashRowLabel = (label, text) => {

    label.textContent = text;

    setTimeout(() => { label.textContent = ``; }, ROW_LABEL_DURATION_IN_MS);
}
