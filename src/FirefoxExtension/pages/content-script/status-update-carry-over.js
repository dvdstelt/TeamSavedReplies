// Particular's task force status updates start "Progress made" from the previous
// update's "What to expect" list. When the status update template goes into a
// comment on a Particular issue, that list replaces the template's empty bullets
// so it no longer has to be copied by hand. Anywhere else nothing happens.

const STATUS_UPDATE_ORGANIZATION = "Particular";
const STATUS_UPDATE_KEYSTRING = "keystring:statusupdate";

const ANY_HEADING_PATTERN = /^#{1,6}\s/;
const STATUS_UPDATE_HEADING_PATTERN = /^#{1,6}\s.*status update/i;
const PROGRESS_MADE_HEADING_PATTERN = /^#{1,6}\s.*progress made/i;
const WHAT_TO_EXPECT_HEADING_PATTERN = /^#{1,6}\s.*what to expect/i;
const EMPTY_BULLET_PATTERN = /^\s*[-*]\s*$/;

const isStatusUpdateTemplate = (body) => body.includes(STATUS_UPDATE_KEYSTRING);

// Older updates were sometimes written without the template, so the heading
// counts as well as the marker.
const isStatusUpdateComment = (body) =>
    body.includes(STATUS_UPDATE_KEYSTRING)
    || STATUS_UPDATE_HEADING_PATTERN.test(body.trimStart().split("\n", 1)[0]);

const particularIssueUrlFor = (url) => {

    const location = new URL(url);

    const match = location.pathname.match(/^\/([^/]+)\/([^/]+)\/issues\/(\d+)/);

    if (location.hostname !== "github.com" || match === null
        || match[1].localeCompare(STATUS_UPDATE_ORGANIZATION, undefined, { sensitivity: "base" }) !== 0) {

        return null;
    }

    return `https://github.com/${match[1]}/${match[2]}/issues/${match[3]}`;
}

const splitLines = (markdown) => markdown.replace(/\r\n?/g, "\n").split("\n");

// The lines under the first heading that matches, up to the next heading of any
// level.
const findSection = (lines, headingPattern, fromLine = 0) => {

    const heading = lines.findIndex((line, index) => index >= fromLine && headingPattern.test(line));

    if (heading === -1) {
        return null;
    }

    const next = lines.findIndex((line, index) => index > heading && ANY_HEADING_PATTERN.test(line));

    return { start: heading + 1, end: next === -1 ? lines.length : next };
}

const trimBlankLines = (lines) => {

    const first = lines.findIndex((line) => line.trim() !== "");

    if (first === -1) {
        return [];
    }

    const last = lines.findLastIndex((line) => line.trim() !== "");

    return lines.slice(first, last + 1);
}

// Copied as written, minus the template's guidance comment. An unclosed comment
// is cut off too: carried over, it would hide the rest of the new update.
const whatToExpectOf = (body) => {

    const lines = splitLines(body);

    const section = findSection(lines, WHAT_TO_EXPECT_HEADING_PATTERN);

    if (section === null) {
        return [];
    }

    const text = lines.slice(section.start, section.end).join("\n")
        .replace(/<!--[\s\S]*?-->/g, "")
        .replace(/<!--[\s\S]*$/, "");

    return trimBlankLines(splitLines(text));
}

// The character range of the empty bullets under "Progress made", searched for
// from where the template went in. Once any of them has text, there is nothing
// left to fill.
const findEmptyProgressBullets = (value, fromIndex) => {

    const lines = splitLines(value);

    const fromLine = value.slice(0, fromIndex).split("\n").length - 1;

    const section = findSection(lines, PROGRESS_MADE_HEADING_PATTERN, fromLine);

    if (section === null) {
        return null;
    }

    let first = section.start;

    while (first < section.end && !EMPTY_BULLET_PATTERN.test(lines[first])) {
        first++;
    }

    if (first === section.end) {
        return null;
    }

    let last = first;

    while (last + 1 < section.end && EMPTY_BULLET_PATTERN.test(lines[last + 1])) {
        last++;
    }

    const offsetOfLine = (line) => lines.slice(0, line).reduce((offset, text) => offset + text.length + 1, 0);

    return { start: offsetOfLine(first), end: offsetOfLine(last) + lines[last].length };
}

// GitHub's soft navigation leaves the data embedded in the open page behind, so
// a fresh copy of the issue is fetched. It carries the markdown of the first and
// last timeline items, which is where the latest update is. Under Manifest V3 a
// content script's fetch runs as the page, signed in, in Chrome and Firefox
// alike; Firefox's content.fetch exists only for Manifest V2.
const fetchIssueComments = async (issueUrl) => {

    const response = await fetch(issueUrl, { credentials: "same-origin" });

    if (!response.ok) {
        throw new Error(`${response.status} ${response.statusText}`.trim());
    }

    const page = new DOMParser().parseFromString(await response.text(), "text/html");

    const comments = new Map();

    const collect = (node) => {

        if (node === null || typeof node !== "object") {
            return;
        }

        if (node.__typename === "IssueComment" && typeof node.body === "string") {
            comments.set(node.id, node);
        }

        Object.values(node).forEach(collect);
    }

    for (const script of page.querySelectorAll('script[data-target="react-app.embeddedData"]')) {
        collect(JSON.parse(script.textContent));
    }

    return Array.from(comments.values());
}

const findLatestStatusUpdate = (comments) => comments
    .filter((comment) => !comment.isMinimized && isStatusUpdateComment(comment.body))
    .sort((left, right) => (left.createdAt ?? "").localeCompare(right.createdAt ?? ""))
    .at(-1);

// The native setter and the input event are what make React notice the change.
// Focus is left where it is: the user may have moved on while this was fetched.
const replaceRangeKeepingCaret = (textarea, start, end, text) => {

    const { selectionStart, selectionEnd } = textarea;

    const shift = (position) => position >= end ? position + text.length - (end - start) : position;

    const setValue = Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, "value").set;

    setValue.call(textarea, textarea.value.slice(0, start) + text + textarea.value.slice(end));

    textarea.dispatchEvent(new Event("input", { bubbles: true }));

    textarea.setSelectionRange(shift(selectionStart), shift(selectionEnd));
}

// Runs after the template is already in, so it never holds the template back.
// If anything goes wrong the empty bullets simply stay, as before.
const carryOverStatusUpdateProgress = async (textarea, insertedAt, body) => {

    if (!isStatusUpdateTemplate(body)) {
        return;
    }

    const issueUrl = particularIssueUrlFor(window.location.href);

    if (issueUrl === null) {
        return;
    }

    try {

        const previous = findLatestStatusUpdate(await fetchIssueComments(issueUrl));

        const items = previous === undefined ? [] : whatToExpectOf(previous.body);

        if (items.length === 0 || !textarea.isConnected) {
            return;
        }

        const bullets = findEmptyProgressBullets(textarea.value, Math.min(insertedAt, textarea.value.length));

        // A caret in the bullets means the user is about to fill them in
        // themselves; the text is not changed under their hands.
        if (bullets === null
            || (textarea.selectionStart <= bullets.end && textarea.selectionEnd >= bullets.start)) {

            return;
        }

        replaceRangeKeepingCaret(textarea, bullets.start, bullets.end, items.join("\n"));
    }
    catch (error) {
        console.warn("Could not carry over the previous status update", error);
    }
}
