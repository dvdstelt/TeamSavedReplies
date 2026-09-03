const SHARED_REPLY_ATTR = "data-team-saved-reply";
const SHARED_LISTBOX_ATTR = "data-team-saved-reply-listbox";
const ACTIVE_ATTR = "data-shared-active";
let _cachedSavedReplies = null;
let _cachedTemplateItem = null;
let _cachedListboxClone = null;
let _cachedLegacyTemplateItem = null;
let _dialogObserverActive = false;

// --- Detection ---

const isPrimerReactDialog = (element) => {
    if (!element || !element.querySelector) return false;
    return element.querySelector('input[placeholder="Search saved replies"]') !== null;
};

const isLegacyDialog = (element) => {
    if (!element) return false;
    if (element.classList?.contains('js-saved-reply-container')) return true;
    if (element.querySelector?.('.js-saved-reply-container')) return true;
    return false;
};

const isSavedRepliesDialog = (element) => {
    return isPrimerReactDialog(element) || isLegacyDialog(element);
};

// --- Shared helpers ---

const matchesSearch = (reply, searchText) => {
    if (!searchText) return true;
    return reply.name.toLowerCase().includes(searchText);
};

// Writing through the native setter and firing input is what makes React notice
// the change; assigning to value directly does not.
const replaceRangeInTextarea = (textarea, start, end, body) => {
    if (!textarea) return false;

    textarea.focus();

    const currentValue = textarea.value;
    const newValue = currentValue.substring(0, start) + body + currentValue.substring(end);

    const nativeInputValueSetter = Object.getOwnPropertyDescriptor(
        window.HTMLTextAreaElement.prototype, 'value'
    ).set;

    nativeInputValueSetter.call(textarea, newValue);
    textarea.dispatchEvent(new Event('input', { bubbles: true }));

    const newCursorPos = start + body.length;
    textarea.setSelectionRange(newCursorPos, newCursorPos);

    return true;
};

const insertReplyIntoTextarea = (body) => {
    const textarea = document.querySelector(
        '#new_comment_field, textarea[name="comment[body]"], div[data-testid="markdown-editor-comment-composer"] textarea, textarea[class*="prc-Textarea-TextArea"]'
    );
    if (!textarea) return false;

    return replaceRangeInTextarea(textarea, textarea.selectionStart, textarea.selectionEnd, body);
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

// --- Primer React dialog (issues, new issues) ---

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

    for (const [index, reply] of filteredReplies.entries()) {
        const item = createReplyListItem(_cachedTemplateItem, reply, index);
        listbox.appendChild(item);
    }
};

const getOrCreateListbox = (dialog) => {
    const previouslyCreated = dialog.querySelector(`[${SHARED_LISTBOX_ATTR}]`);

    const existingListbox = dialog.querySelector(`ul[role="listbox"]:not([${SHARED_LISTBOX_ATTR}])`);
    if (existingListbox) {
        if (previouslyCreated) {
            previouslyCreated.remove();
        }
        return existingListbox;
    }

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

const onPrimerReactDialogOpened = async (dialog) => {
    console.log("onPrimerReactDialogOpened: dialog detected");

    if (!_cachedSavedReplies) {
        _cachedSavedReplies = await getTemplatesForUrl(null);
    }

    if (!_cachedSavedReplies || _cachedSavedReplies.length === 0) return;

    const initialInject = () => {
        const listbox = dialog.querySelector('ul[role="listbox"]');
        if (!listbox) return false;

        _cachedListboxClone = listbox.cloneNode(false);
        _cachedListboxClone.removeAttribute("data-has-active-descendant");

        injectSharedReplies(listbox, _cachedSavedReplies, "");

        dialog.addEventListener("input", (e) => {
            if (!e.target.matches('input[placeholder="Search saved replies"]')) return;
            const searchText = e.target.value.toLowerCase();
            setTimeout(() => injectIntoCurrentListbox(dialog, searchText), 0);
        });

        dialog.addEventListener("keydown", (e) => {
            if (e.key !== "ArrowDown" && e.key !== "ArrowUp" && e.key !== "Enter") return;

            const currentListbox = getOrCreateListbox(dialog);
            if (!currentListbox) return;

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

    const dialogObserver = new MutationObserver(() => {
        if (initialInject()) {
            dialogObserver.disconnect();
        }
    });
    dialogObserver.observe(dialog, { childList: true, subtree: true });
};

// --- Legacy dialog (PRs) ---

const createLegacyReplyListItem = (templateItem, reply, index) => {
    const item = templateItem.cloneNode(true);

    item.setAttribute(SHARED_REPLY_ATTR, "true");
    item.setAttribute("data-value", reply.name);

    const labelSpan = item.querySelector('.ActionListItem-label');
    if (labelSpan) {
        labelSpan.textContent = reply.name;
    }

    const bodySpan = item.querySelector('.js-saved-reply-body .Truncate-text');
    if (bodySpan) {
        bodySpan.textContent = reply.body;
    }

    const trailingLabel = item.querySelector('.ActionListItem-visual--trailing .Label');
    if (trailingLabel) {
        trailingLabel.textContent = "";
    }

    const button = item.querySelector('button');
    if (button) {
        button.addEventListener("click", (e) => {
            e.preventDefault();
            e.stopPropagation();
            insertReplyIntoTextarea(reply.body);

            const dialogEl = item.closest('dialog');
            if (dialogEl) dialogEl.close();
        });
    }

    return item;
};

const injectIntoLegacyList = (list) => {
    if (list.querySelector(`[${SHARED_REPLY_ATTR}]`)) return;

    const templateItem = list.querySelector('li.ActionListItem');
    if (templateItem) {
        _cachedLegacyTemplateItem = templateItem.cloneNode(true);
    }

    if (!_cachedLegacyTemplateItem) return;

    for (const [index, reply] of _cachedSavedReplies.entries()) {
        const item = createLegacyReplyListItem(_cachedLegacyTemplateItem, reply, index);
        list.appendChild(item);
    }

    console.log("onLegacyDialogOpened: injected", _cachedSavedReplies.length, "replies");
};

const tryLegacyInject = () => {
    const list = document.querySelector('dialog.js-saved-reply-container[open] ul.js-saved-reply-menu');
    if (list) {
        injectIntoLegacyList(list);
        return true;
    }
    return false;
};

const onLegacyDialogDetected = (dialog) => {
    const actualDialog = dialog.nodeName === 'DIALOG'
        ? dialog
        : dialog.querySelector('dialog.js-saved-reply-container')
            || dialog.querySelector('dialog');

    if (!actualDialog) return;

    // If dialog is already open, inject now
    if (actualDialog.hasAttribute('open')) {
        onLegacyDialogReady(actualDialog);
        return;
    }

    // Dialog is closed (pre-rendered on page load). Watch for it to open.
    const openObserver = new MutationObserver(() => {
        if (actualDialog.hasAttribute('open')) {
            onLegacyDialogReady(actualDialog);
        }
    });
    openObserver.observe(actualDialog, { attributes: true, attributeFilter: ['open'] });
};

const onLegacyDialogReady = async (actualDialog) => {
    if (!_cachedSavedReplies) {
        _cachedSavedReplies = await getTemplatesForUrl(null);
    }

    if (!_cachedSavedReplies || _cachedSavedReplies.length === 0) return;

    if (tryLegacyInject()) return;

    // Content loads lazily via <include-fragment>. Poll until the list appears.
    let attempts = 0;
    const interval = setInterval(() => {
        if (tryLegacyInject() || ++attempts > 25) {
            clearInterval(interval);
        }
    }, 200);
};

// --- Dialog detection and observer ---

const onSavedRepliesDialogOpened = async (dialog) => {
    if (isPrimerReactDialog(dialog)) {
        await onPrimerReactDialogOpened(dialog);
    } else if (isLegacyDialog(dialog)) {
        onLegacyDialogDetected(dialog);
    }
};

const observeSavedRepliesDialog = () => {
    if (_dialogObserverActive) return;
    _dialogObserverActive = true;

    console.log("observeSavedRepliesDialog: observer active");

    // Scan for legacy dialogs already in the DOM (and retry, as GitHub may add them after page load)
    scanForLegacyDialogs();
    setTimeout(scanForLegacyDialogs, 1000);
    setTimeout(scanForLegacyDialogs, 3000);

    const observer = new MutationObserver((mutations) => {
        for (const mutation of mutations) {
            for (const node of mutation.addedNodes) {
                if (node.nodeType !== Node.ELEMENT_NODE) continue;

                let dialog = null;

                // Primer React: div[role="dialog"]
                if (node.getAttribute && node.getAttribute('role') === 'dialog') {
                    dialog = node;
                } else if (node.nodeName === 'DIALOG' || node.nodeName === 'DIALOG-HELPER') {
                    // Legacy: <dialog> or <dialog-helper>
                    dialog = node;
                } else if (node.querySelector) {
                    dialog = node.querySelector('[role="dialog"]')
                        || node.querySelector('dialog.js-saved-reply-container');
                }

                if (dialog && isSavedRepliesDialog(dialog)) {
                    onSavedRepliesDialogOpened(dialog);
                }
            }
        }
    });

    observer.observe(document.body, { childList: true, subtree: true });
};

const scanForLegacyDialogs = () => {
    document.querySelectorAll('dialog.js-saved-reply-container').forEach(dialog => {
        onLegacyDialogDetected(dialog);
    });
};

document.addEventListener("soft-nav:end", () => {
    _cachedSavedReplies = null;
    _cachedTemplateItem = null;
    _cachedListboxClone = null;
    _cachedLegacyTemplateItem = null;

    // Re-scan after navigation since dialog may be added by GitHub's JS
    scanForLegacyDialogs();
    setTimeout(scanForLegacyDialogs, 1000);
    setTimeout(scanForLegacyDialogs, 3000);
});
