const SHARED_REPLY_ATTR = "data-shared-saved-reply";
const SHARED_LISTBOX_ATTR = "data-shared-saved-reply-listbox";
let _cachedSavedReplies = null;
let _cachedTemplateItem = null;
let _cachedListboxClone = null;
let _dialogObserverActive = false;

const isSavedRepliesDialog = (element) => {
    if (!element || !element.querySelector) return false;
    return element.querySelector('input[placeholder="Search saved replies"]') !== null;
};

const matchesSearch = (reply, searchText) => {
    if (!searchText) return true;
    return reply.name.toLowerCase().includes(searchText);
};

const insertReplyIntoTextarea = (body) => {
    const textarea = document.querySelector(
        'textarea[name="comment[body]"], div[data-testid="markdown-editor-comment-composer"] textarea, textarea[class*="prc-Textarea-TextArea"]'
    );
    if (!textarea) return;

    textarea.focus();

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const currentValue = textarea.value;
    const newValue = currentValue.substring(0, start) + body + currentValue.substring(end);

    const nativeInputValueSetter = Object.getOwnPropertyDescriptor(
        window.HTMLTextAreaElement.prototype, 'value'
    ).set;

    nativeInputValueSetter.call(textarea, newValue);
    textarea.dispatchEvent(new Event('input', { bubbles: true }));

    // Place cursor at the end of the inserted text
    const newCursorPos = start + body.length;
    textarea.setSelectionRange(newCursorPos, newCursorPos);
};

const closeSavedRepliesDialog = () => {
    const target = document.activeElement || document.body;
    target.dispatchEvent(new KeyboardEvent('keydown', {
        key: 'Escape',
        code: 'Escape',
        keyCode: 27,
        which: 27,
        bubbles: true,
        cancelable: true
    }));
};

const ACTIVE_ATTR = "data-shared-active";

const createReplyListItem = (templateItem, reply, index) => {
    const item = templateItem.cloneNode(true);

    item.setAttribute(SHARED_REPLY_ATTR, "true");

    const baseId = `shared-reply-${index}`;
    item.id = baseId;
    item.setAttribute("data-id", `shared-${index}`);
    item.removeAttribute("data-first-child");
    item.removeAttribute("aria-current");
    item.removeAttribute("data-is-active-descendant");
    item.setAttribute("aria-selected", "false");
    item.setAttribute("aria-labelledby", `${baseId}--label`);
    item.setAttribute("aria-describedby", `${baseId}--block-description`);

    // Hide the checkmark SVG but keep the selection span for indentation and blue bar
    const checkmark = item.querySelector('[data-component="ActionList.Selection"] svg');
    if (checkmark) {
        checkmark.style.visibility = "hidden";
    }


    const labelSpan = item.querySelector('[id$="--label"]');
    if (labelSpan) {
        labelSpan.id = `${baseId}--label`;
        labelSpan.textContent = reply.name;
    }

    const descSpan = item.querySelector('[data-component="ActionList.Description"]');
    if (descSpan) {
        descSpan.id = `${baseId}--block-description`;
        descSpan.textContent = reply.body;
    }

    const trailingVisual = item.querySelector('[id$="--trailing-visual"]');
    if (trailingVisual) {
        trailingVisual.id = `${baseId}--trailing-visual`;
        trailingVisual.textContent = "";
    }

    item.addEventListener("mouseenter", () => {
        const listbox = item.closest('ul[role="listbox"]');
        // Clear active state from all siblings
        listbox?.querySelectorAll("[data-is-active-descendant]").forEach(el => {
            el.removeAttribute("data-is-active-descendant");
            el.removeAttribute(ACTIVE_ATTR);
            el.style.backgroundColor = "";
        });
        item.setAttribute("data-is-active-descendant", "true");
        item.setAttribute(ACTIVE_ATTR, "true");
        if (listbox) listbox.setAttribute("data-has-active-descendant", item.id);
    });
    item.addEventListener("mouseleave", () => {
        item.removeAttribute("data-is-active-descendant");
        item.removeAttribute(ACTIVE_ATTR);
        const listbox = item.closest('ul[role="listbox"]');
        if (listbox) listbox.removeAttribute("data-has-active-descendant");
    });

    item.addEventListener("click", (e) => {
        e.preventDefault();
        e.stopPropagation();
        insertReplyIntoTextarea(reply.body);
        closeSavedRepliesDialog();
    });

    return item;
};

const injectSharedReplies = (listbox, savedReplies, searchText) => {
    listbox.querySelectorAll(`[${SHARED_REPLY_ATTR}]`).forEach(el => el.remove());

    const nativeItem = listbox.querySelector(`li[role="option"]:not([${SHARED_REPLY_ATTR}])`);
    if (nativeItem) {
        _cachedTemplateItem = nativeItem.cloneNode(true);
    }

    if (!_cachedTemplateItem) return;

    const filteredReplies = savedReplies.filter(r => matchesSearch(r, searchText));

    console.log("injectSharedReplies: searchText =", searchText, "filtered =", filteredReplies.length, "of", savedReplies.length);

    for (const [index, reply] of filteredReplies.entries()) {
        const item = createReplyListItem(_cachedTemplateItem, reply, index);
        listbox.appendChild(item);
    }
};

const getOrCreateListbox = (dialog) => {
    // First, remove any listbox we previously created
    const previouslyCreated = dialog.querySelector(`[${SHARED_LISTBOX_ATTR}]`);

    // Check if React's listbox exists
    const existingListbox = dialog.querySelector(`ul[role="listbox"]:not([${SHARED_LISTBOX_ATTR}])`);
    if (existingListbox) {
        // React's listbox is present; remove ours if we created one
        if (previouslyCreated) {
            previouslyCreated.remove();
        }
        return existingListbox;
    }

    // React removed its listbox (no native matches). Create one from cache.
    if (!_cachedListboxClone) return null;

    const container = dialog.querySelector('[data-testid="filtered-action-list"] > div:last-child')
        || dialog.querySelector('[data-testid="filtered-action-list"]');
    if (!container) return null;

    if (previouslyCreated) {
        return previouslyCreated;
    }

    const listbox = _cachedListboxClone.cloneNode(false);
    listbox.setAttribute(SHARED_LISTBOX_ATTR, "true");
    container.prepend(listbox);

    console.log("getOrCreateListbox: created fallback listbox in container");

    return listbox;
};

const hideNoItemsMessage = (dialog, hide) => {
    const message = dialog.querySelector('[class*="SelectPanel-Message"]');
    if (message) {
        message.style.display = hide ? "none" : "";
    }
};

const injectIntoCurrentListbox = (dialog, searchText) => {
    const listbox = getOrCreateListbox(dialog);
    if (!listbox) return;

    injectSharedReplies(listbox, _cachedSavedReplies, searchText);

    const hasSharedItems = listbox.querySelector(`[${SHARED_REPLY_ATTR}]`) !== null;
    hideNoItemsMessage(dialog, hasSharedItems);
};

const onSavedRepliesDialogOpened = async (dialog) => {
    console.log("onSavedRepliesDialogOpened: dialog detected");

    if (!_cachedSavedReplies) {
        _cachedSavedReplies = await getMatchingSavedReplyConfigsFromLocalStorage(null);
        console.log("onSavedRepliesDialogOpened: loaded replies from storage", _cachedSavedReplies);
    }

    if (!_cachedSavedReplies || _cachedSavedReplies.length === 0) {
        console.log("onSavedRepliesDialogOpened: no saved replies found in storage");
        return;
    }

    const initialInject = () => {
        const listbox = dialog.querySelector('ul[role="listbox"]');
        if (!listbox) return false;

        // Cache the listbox element (empty clone) for when React removes it
        _cachedListboxClone = listbox.cloneNode(false);
        _cachedListboxClone.removeAttribute("data-has-active-descendant");

        injectSharedReplies(listbox, _cachedSavedReplies, "");

        // Use event delegation on dialog so handlers survive React replacing elements
        dialog.addEventListener("input", (e) => {
            if (!e.target.matches('input[placeholder="Search saved replies"]')) return;
            const searchText = e.target.value.toLowerCase();
            console.log("search input changed:", searchText);
            setTimeout(() => injectIntoCurrentListbox(dialog, searchText), 0);
        });

        dialog.addEventListener("keydown", (e) => {
            if (e.key !== "ArrowDown" && e.key !== "ArrowUp" && e.key !== "Enter") return;

            const currentListbox = getOrCreateListbox(dialog);
            if (!currentListbox) return;

            // Only handle navigation when no native items exist
            const hasNativeItems = currentListbox.querySelector(`li[role="option"]:not([${SHARED_REPLY_ATTR}])`);
            if (hasNativeItems) return;

            const items = Array.from(currentListbox.querySelectorAll(`[${SHARED_REPLY_ATTR}]`));
            if (items.length === 0) return;

            e.preventDefault();
            e.stopPropagation();

            const selectedIndex = items.findIndex(item => item.hasAttribute(ACTIVE_ATTR));

            if (e.key === "Enter") {
                if (selectedIndex >= 0) {
                    items[selectedIndex].click();
                }
                return;
            }

            let nextIndex;
            if (e.key === "ArrowDown") {
                nextIndex = selectedIndex < items.length - 1 ? selectedIndex + 1 : 0;
            } else {
                nextIndex = selectedIndex > 0 ? selectedIndex - 1 : items.length - 1;
            }

            items.forEach(item => {
                item.removeAttribute(ACTIVE_ATTR);
                item.removeAttribute("data-is-active-descendant");
                item.style.backgroundColor = "";
            });
            items[nextIndex].setAttribute(ACTIVE_ATTR, "true");
            items[nextIndex].setAttribute("data-is-active-descendant", "true");
            items[nextIndex].style.backgroundColor = "var(--control-transparent-bgColor-hover, rgba(175,184,193,0.12))";
            currentListbox.setAttribute("data-has-active-descendant", items[nextIndex].id);
            items[nextIndex].scrollIntoView({ block: "nearest" });
        });

        return true;
    };

    if (initialInject()) return;

    console.log("onSavedRepliesDialogOpened: listbox not yet rendered, waiting...");

    const dialogObserver = new MutationObserver(() => {
        if (initialInject()) {
            console.log("onSavedRepliesDialogOpened: listbox appeared");
            dialogObserver.disconnect();
        }
    });
    dialogObserver.observe(dialog, { childList: true, subtree: true });
};

const observeSavedRepliesDialog = () => {
    if (_dialogObserverActive) return;
    _dialogObserverActive = true;

    console.log("observeSavedRepliesDialog: observer active");

    const observer = new MutationObserver((mutations) => {
        for (const mutation of mutations) {
            for (const node of mutation.addedNodes) {
                if (node.nodeType !== Node.ELEMENT_NODE) continue;

                let dialog = null;
                if (node.getAttribute && node.getAttribute('role') === 'dialog') {
                    dialog = node;
                } else if (node.querySelector) {
                    dialog = node.querySelector('[role="dialog"]');
                }

                if (dialog && isSavedRepliesDialog(dialog)) {
                    onSavedRepliesDialogOpened(dialog);
                }
            }
        }
    });

    observer.observe(document.body, { childList: true, subtree: true });
};

document.addEventListener("soft-nav:end", () => {
    _cachedSavedReplies = null;
    _cachedTemplateItem = null;
    _cachedListboxClone = null;
});
