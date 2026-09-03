// Typing the trigger at the start of a word in a GitHub comment opens a filtered
// list of templates at the caret. Picking one replaces the trigger and whatever
// was typed after it with the template body.

const COMMENT_BOX_SELECTOR =
    '#new_comment_field, textarea[name="comment[body]"], div[data-testid="markdown-editor-comment-composer"] textarea, textarea[class*="prc-Textarea-TextArea"]';

const INLINE_MENU_CLASS = "team-saved-replies-inline-menu";

let inlineMenuElement = null;
let inlineMenuState = null;
let inlineMenuTemplates = [];
let inlineMenuUsageCounts = {};
let inlineMenuSettings = { inlineMenuEnabled: true, inlineTrigger: "!!" };

const isCommentBox = (element) =>
    element instanceof HTMLTextAreaElement && element.matches(COMMENT_BOX_SELECTOR);

// GitHub's own @ / # / : suggester owns the arrow keys and Enter while it is
// open. Two lists fighting over the same keys feels broken, so ours stands down.
const gitHubSuggesterIsOpen = () =>
    Array.from(document.querySelectorAll('[role="listbox"]'))
        .some((listbox) =>
            !listbox.closest(`.${INLINE_MENU_CLASS}`)
            && listbox.offsetParent !== null);

// A textarea exposes no caret coordinates, so the text up to the caret is laid
// out again in a hidden copy of the box and the marker is measured.
const MIRRORED_STYLE_PROPERTIES = [
    "boxSizing", "width", "borderTopWidth", "borderRightWidth", "borderBottomWidth",
    "borderLeftWidth", "paddingTop", "paddingRight", "paddingBottom", "paddingLeft",
    "fontStyle", "fontVariant", "fontWeight", "fontStretch", "fontSize", "fontFamily",
    "lineHeight", "letterSpacing", "wordSpacing", "textTransform", "textIndent",
    "textAlign", "tabSize"
];

const caretOffsetWithin = (textarea, position) => {
    try {
        const mirror = document.createElement("div");
        const computed = window.getComputedStyle(textarea);

        for (const property of MIRRORED_STYLE_PROPERTIES) {
            mirror.style[property] = computed[property];
        }

        mirror.style.position = "absolute";
        mirror.style.top = "0";
        mirror.style.left = "-9999px";
        mirror.style.visibility = "hidden";
        mirror.style.whiteSpace = "pre-wrap";
        mirror.style.overflowWrap = "break-word";
        mirror.style.height = "auto";

        mirror.textContent = textarea.value.slice(0, position);

        const marker = document.createElement("span");
        marker.textContent = textarea.value.slice(position) || ".";
        mirror.appendChild(marker);

        document.body.appendChild(mirror);

        const offset = { top: marker.offsetTop, left: marker.offsetLeft,
                         lineHeight: parseFloat(computed.lineHeight) || 20 };

        mirror.remove();

        return offset;
    }
    catch (error) {
        return null;
    }
}

// The trigger only counts at the start of a word, so it cannot fire in the
// middle of prose or inside a url.
const findTriggerBeforeCaret = (textarea) => {

    const trigger = inlineMenuSettings.inlineTrigger;

    if (!trigger || textarea.selectionStart !== textarea.selectionEnd) {
        return null;
    }

    const caret = textarea.selectionStart;
    const before = textarea.value.slice(0, caret);
    const start = before.lastIndexOf(trigger);

    if (start === -1) {
        return null;
    }

    const preceding = start === 0 ? "\n" : before.charAt(start - 1);

    if (!/\s/.test(preceding)) {
        return null;
    }

    const query = before.slice(start + trigger.length);

    if (query.includes("\n")) {
        return null;
    }

    return { start: start, query: query };
}

const closeInlineMenu = () => {

    inlineMenuElement?.remove();

    inlineMenuElement = null;
    inlineMenuState = null;
}

const positionInlineMenu = (textarea, triggerStart) => {

    const box = textarea.getBoundingClientRect();
    const offset = caretOffsetWithin(textarea, triggerStart);

    // Anchoring to the box is the fallback when the caret cannot be measured;
    // it is less precise but works on every editor surface.
    const top = offset === null
        ? box.bottom + window.scrollY
        : box.top + window.scrollY + offset.top - textarea.scrollTop + offset.lineHeight;

    const left = offset === null
        ? box.left + window.scrollX
        : box.left + window.scrollX + offset.left - textarea.scrollLeft;

    const maxLeft = window.scrollX + document.documentElement.clientWidth
        - inlineMenuElement.offsetWidth - 8;

    inlineMenuElement.style.top = `${Math.round(top)}px`;
    inlineMenuElement.style.left = `${Math.round(Math.max(window.scrollX + 8, Math.min(left, maxLeft)))}px`;
}

const renderInlineMenu = () => {

    if (inlineMenuState === null) {
        return;
    }

    const showBadges =
        new Set(inlineMenuTemplates.map((template) => template.sourceId)).size > 1;

    inlineMenuElement.replaceChildren(...inlineMenuState.matches.map((template, index) => {

        const children = [
            createElement("span", {
                children: [template.name],
                className: "team-saved-replies-inline-name"
            })
        ];

        if (showBadges) {
            children.push(createElement("span", {
                children: [template.sourceName],
                className: "team-saved-replies-inline-badge"
            }));
        }

        const option = createElement("button", {
            children: children,
            className: `team-saved-replies-inline-option${index === inlineMenuState.activeIndex ? " active" : ""}`,
            type: "button"
        });

        // Mousedown rather than click: clicking would blur the comment box first
        // and take the caret with it.
        option.addEventListener("mousedown", (event) => {
            event.preventDefault();
            acceptInlineMenuOption(index);
        });

        return option;
    }));

    positionInlineMenu(inlineMenuState.textarea, inlineMenuState.start);
}

const acceptInlineMenuOption = async (index) => {

    if (inlineMenuState === null) {
        return;
    }

    const { textarea, start, matches } = inlineMenuState;
    const template = matches[index];

    if (template === undefined) {
        return;
    }

    const caret = textarea.selectionStart;

    closeInlineMenu();

    replaceRangeInTextarea(textarea, start, caret, template.body);

    await recordTemplateUsed(template.id);

    inlineMenuUsageCounts = await getUsageCounts();
}

const openOrUpdateInlineMenu = (textarea) => {

    const trigger = findTriggerBeforeCaret(textarea);

    if (trigger === null || gitHubSuggesterIsOpen()) {
        closeInlineMenu();
        return;
    }

    const matches = rankTemplates(inlineMenuTemplates, trigger.query, inlineMenuUsageCounts);

    if (matches.length === 0) {
        closeInlineMenu();
        return;
    }

    if (inlineMenuElement === null) {

        inlineMenuElement = createElement("div", {
            className: INLINE_MENU_CLASS,
            role: "listbox",
            "aria-label": "Saved reply templates"
        });

        document.body.appendChild(inlineMenuElement);
    }

    const previous = inlineMenuState?.matches?.[inlineMenuState?.activeIndex]?.id;

    const carriedOver = matches.findIndex((template) => template.id === previous);

    inlineMenuState = {
        textarea: textarea,
        start: trigger.start,
        query: trigger.query,
        matches: matches,
        activeIndex: carriedOver === -1 ? 0 : carriedOver
    };

    renderInlineMenu();
}

const moveInlineMenuSelection = (delta) => {

    const count = inlineMenuState.matches.length;

    inlineMenuState.activeIndex = (inlineMenuState.activeIndex + delta + count) % count;

    renderInlineMenu();

    inlineMenuElement
        .children[inlineMenuState.activeIndex]
        ?.scrollIntoView({ block: "nearest" });
}

const handleInlineMenuKeydown = (event) => {

    if (inlineMenuState === null || !isCommentBox(event.target)) {
        return;
    }

    // Ctrl+Enter submits the comment; that must keep working.
    if (event.ctrlKey || event.metaKey || event.altKey) {
        return;
    }

    switch (event.key) {
        case "ArrowDown": moveInlineMenuSelection(1); break;
        case "ArrowUp":   moveInlineMenuSelection(-1); break;
        case "Enter":
        case "Tab":       acceptInlineMenuOption(inlineMenuState.activeIndex); break;
        case "Escape":    closeInlineMenu(); break;
        default:          return;
    }

    event.preventDefault();
    event.stopPropagation();
}

const refreshInlineMenuContext = async () => {

    inlineMenuSettings = await getGlobalSettings();

    inlineMenuUsageCounts = await getUsageCounts();

    inlineMenuTemplates = inlineMenuSettings.inlineMenuEnabled
        ? await getTemplatesForUrl(null)
        : [];

    if (!inlineMenuSettings.inlineMenuEnabled) {
        closeInlineMenu();
    }
}

const startInlineTemplateMenu = async () => {

    await refreshInlineMenuContext();

    // Delegated, because GitHub replaces comment boxes as you navigate.
    document.addEventListener("keydown", handleInlineMenuKeydown, true);

    document.addEventListener("input", (event) => {

        if (inlineMenuSettings.inlineMenuEnabled && isCommentBox(event.target)) {
            openOrUpdateInlineMenu(event.target);
        }
    });

    // Arrow keys and clicks move the caret without changing the text.
    document.addEventListener("keyup", (event) => {

        if (inlineMenuState !== null && isCommentBox(event.target)
            && ["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) {

            openOrUpdateInlineMenu(event.target);
        }
    });

    document.addEventListener("focusout", (event) => {

        if (isCommentBox(event.target)) {
            closeInlineMenu();
        }
    });

    document.addEventListener("scroll", () => {

        if (inlineMenuState !== null) {
            positionInlineMenu(inlineMenuState.textarea, inlineMenuState.start);
        }
    }, true);

    window.addEventListener("resize", () => {

        if (inlineMenuState !== null) {
            positionInlineMenu(inlineMenuState.textarea, inlineMenuState.start);
        }
    });

    chrome.storage.onChanged.addListener(async (changes) => {

        if (changes[SETTINGS_KEY] || changes[SOURCES_KEY]
            || Object.keys(changes).some((key) => key.startsWith(`replies:`))) {

            await refreshInlineMenuContext();
        }
    });
}
