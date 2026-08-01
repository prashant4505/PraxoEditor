// Proof-of-concept formatting plugin — NOT the Phase 3 architecture.
//
// Real formatting plugins (planned for Phase 3) will operate on the
// document model and selection manager that Phase 2 introduces. Neither
// exists yet, so this plugin is a deliberate stopgap: it drives the native
// `document.execCommand` API directly against the contenteditable surface.
// It exists to demonstrate that formatting behavior can be added entirely
// through the existing plugin/command API, without any core changes — swap
// this plugin out once real formatting plugins land, no editor-facing API
// changes required.

function registerExecCommand(editor, name, execCommandName, value) {
  editor.commands.register(name, {
    execute: () => {
      document.execCommand(execCommandName, false, value);
      editor.events.emit('change', { source: 'user' });
    },
    // Always enabled: this is a stand-in for real "can this run right now"
    // logic (e.g. disabling `bold` when the selection spans a code block),
    // which needs the document model to answer correctly.
    isEnabled: () => true,
  });
}

// Block-level tags selectable from the toolbar's "Paragraph style" dropdown.
export const BLOCK_FORMATS = ['p', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6'];

// Block-level tags that alignment is applied to directly (as inline
// `style.textAlign`), used by the alignLeft toggle below.
const ALIGNABLE_TAGS = new Set(['P', 'DIV', 'LI', 'H1', 'H2', 'H3', 'H4', 'H5', 'H6', 'BLOCKQUOTE']);

// Walks up from `node` to the nearest enclosing alignable block element.
function closestBlock(node) {
  let el = node && (node.nodeType === Node.ELEMENT_NODE ? node : node.parentElement);
  while (el && !ALIGNABLE_TAGS.has(el.tagName)) {
    el = el.parentElement;
  }
  return el;
}

// Tags that establish their own block-level box. `insertHtml` (below) uses
// this to decide whether pasted-in content needs to split the current block
// rather than being spliced into its inline content — inserting e.g. a <p>
// or <div> directly into the middle of an existing <p> produces invalid
// nested-block markup that browsers silently reinterpret (and mangle) the
// next time it's reparsed, e.g. via the Source view round-trip.
const BLOCK_LEVEL_TAGS = new Set(['P', 'DIV', 'UL', 'OL', 'LI', 'TABLE', 'BLOCKQUOTE', 'PRE', 'HR', ...BLOCK_FORMATS.map((tag) => tag.toUpperCase())]);

// Walks up from `node` to whichever ancestor is a direct child of `root` —
// i.e. the top-level block currently containing the caret.
function closestTopLevelBlock(node, root) {
  let el = node && (node.nodeType === Node.ELEMENT_NODE ? node : node.parentElement);
  while (el && el.parentElement && el.parentElement !== root) {
    el = el.parentElement;
  }
  return el && el.parentElement === root ? el : null;
}

// Collects every block element that the current selection touches (not just
// the anchor block), so alignment applies/toggles across a multi-paragraph
// selection the same way it does for a single caret position.
function blocksInSelection() {
  const selection = document.getSelection();
  if (!selection || selection.rangeCount === 0) return [];
  const range = selection.getRangeAt(0);
  const container =
    range.commonAncestorContainer.nodeType === Node.ELEMENT_NODE
      ? range.commonAncestorContainer
      : range.commonAncestorContainer.parentElement;
  const root = container?.closest('[contenteditable]');
  if (!root) return [];

  const blocks = [];
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_ELEMENT, {
    acceptNode: (el) => (ALIGNABLE_TAGS.has(el.tagName) ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_SKIP),
  });
  let node = walker.nextNode();
  while (node) {
    if (range.intersectsNode(node)) blocks.push(node);
    node = walker.nextNode();
  }
  if (blocks.length === 0) {
    const fallback = closestBlock(range.startContainer);
    if (fallback) blocks.push(fallback);
  }
  return blocks;
}

// Walks up from `node` to the nearest enclosing <a>, if any — used to decide
// whether the "link" command should edit or create a link, and to drive its
// toolbar active state.
export function closestLink(node) {
  let el = node && (node.nodeType === Node.ELEMENT_NODE ? node : node.parentElement);
  while (el && el.tagName !== 'A') {
    el = el.parentElement;
  }
  return el;
}

// Only allow schemes/forms that can't execute script when clicked (rules out
// `javascript:`, `data:`, etc). Bare "domain.tld" input is treated as https.
const SAFE_URL_PATTERN = /^(https?:|mailto:|tel:|\/|#)/i;
const BARE_DOMAIN_PATTERN = /^[\w-]+(\.[\w-]+)+(\/.*)?$/i;

// Native contenteditable traps the caret inside a <pre>: Enter only ever
// inserts a <br>, it never breaks out into a new paragraph the way it does
// for every other block type. Without an escape hatch a code block becomes a
// dead end — there's no keyboard-only way back to plain text. Convention
// (Notion, GitHub, etc): pressing Enter again on an already-blank trailing
// line exits the block. Returns true if it handled the keypress (caller
// should preventDefault), false to let Enter behave normally.
export function exitCodeBlockOnDoubleEnter(editor) {
  const selection = document.getSelection();
  if (!selection || selection.rangeCount === 0 || !selection.isCollapsed) return false;
  const range = selection.getRangeAt(0);
  const anchorEl =
    range.startContainer.nodeType === Node.ELEMENT_NODE ? range.startContainer : range.startContainer.parentElement;
  const pre = anchorEl?.closest('pre');
  if (!pre) return false;

  // Only exit from the very end of the block — a blank line in the middle of
  // otherwise-real code is just a blank line.
  const tail = document.createRange();
  tail.selectNodeContents(pre);
  tail.setStart(range.endContainer, range.endOffset);
  if (tail.toString().length > 0) return false;

  let text = '';
  for (const node of pre.childNodes) {
    if (node === range.endContainer) {
      text += node.textContent.slice(0, range.endOffset);
      break;
    }
    text += node.nodeName === 'BR' ? '\n' : node.textContent;
  }
  const lastLine = text.slice(text.lastIndexOf('\n') + 1);
  if (lastLine !== '' || !text.includes('\n')) return false;

  // The trailing blank line was created by the previous Enter press — drop
  // it, then continue the document after the code block instead of inside
  // it. A single Enter at the end of a <pre> actually inserts two <br>s (the
  // browser adds a filler one so the empty line renders), so strip all of
  // them, not just one.
  while (pre.lastChild?.nodeName === 'BR') pre.removeChild(pre.lastChild);

  const paragraph = document.createElement('p');
  paragraph.appendChild(document.createElement('br'));
  if (pre.childNodes.length === 0) {
    pre.replaceWith(paragraph);
  } else {
    pre.after(paragraph);
  }

  const newRange = document.createRange();
  newRange.setStart(paragraph, 0);
  newRange.collapse(true);
  selection.removeAllRanges();
  selection.addRange(newRange);

  editor.events.emit('change', { source: 'user' });
  return true;
}

export function sanitizeLinkUrl(rawUrl) {
  const url = (rawUrl || '').trim();
  if (!url) return '';
  if (SAFE_URL_PATTERN.test(url)) return url;
  if (BARE_DOMAIN_PATTERN.test(url)) return `https://${url}`;
  return '';
}

export const formattingPlugin = {
  name: 'formattingPoc',
  init({ editor }) {
    registerExecCommand(editor, 'bold', 'bold');
    registerExecCommand(editor, 'italic', 'italic');
    registerExecCommand(editor, 'underline', 'underline');
    registerExecCommand(editor, 'strikethrough', 'strikeThrough');
    editor.commands.register('alignLeft', {
      // Toggle: apply explicit left alignment, or strip it back to the
      // block's default (no inline text-align) if every touched block is
      // already explicitly left-aligned. `execCommand('justifyLeft')` alone
      // can't do this — it's already the browser default, so calling it
      // again is a no-op and the toolbar button would never de-activate.
      execute: () => {
        const blocks = blocksInSelection();
        if (blocks.length === 0) return;
        const isActive = blocks.every((block) => block.style.textAlign === 'left');
        for (const block of blocks) {
          if (isActive) {
            block.style.removeProperty('text-align');
            if (!block.getAttribute('style')) block.removeAttribute('style');
          } else {
            block.style.textAlign = 'left';
          }
        }
        editor.events.emit('change', { source: 'user' });
      },
      isEnabled: () => true,
    });
    editor.commands.register('alignCenter', {
      // Toggle: apply explicit center alignment, or strip it back to the
      // block's default (no inline text-align) if every touched block is
      // already explicitly center-aligned. Same rationale as `alignLeft`
      // above — `execCommand('justifyCenter')` alone can't toggle off.
      execute: () => {
        const blocks = blocksInSelection();
        if (blocks.length === 0) return;
        const isActive = blocks.every((block) => block.style.textAlign === 'center');
        for (const block of blocks) {
          if (isActive) {
            block.style.removeProperty('text-align');
            if (!block.getAttribute('style')) block.removeAttribute('style');
          } else {
            block.style.textAlign = 'center';
          }
        }
        editor.events.emit('change', { source: 'user' });
      },
      isEnabled: () => true,
    });
    editor.commands.register('alignRight', {
      // Toggle: apply explicit right alignment, or strip it back to the
      // block's default (no inline text-align) if every touched block is
      // already explicitly right-aligned. Same rationale as `alignLeft`
      // above — `execCommand('justifyRight')` alone can't toggle off.
      execute: () => {
        const blocks = blocksInSelection();
        if (blocks.length === 0) return;
        const isActive = blocks.every((block) => block.style.textAlign === 'right');
        for (const block of blocks) {
          if (isActive) {
            block.style.removeProperty('text-align');
            if (!block.getAttribute('style')) block.removeAttribute('style');
          } else {
            block.style.textAlign = 'right';
          }
        }
        editor.events.emit('change', { source: 'user' });
      },
      isEnabled: () => true,
    });
    editor.commands.register('alignJustify', {
      // Toggle: apply explicit justify alignment, or strip it back to the
      // block's default (no inline text-align) if every touched block is
      // already explicitly justified. Same rationale as `alignLeft`
      // above — `execCommand('justifyFull')` alone can't toggle off.
      execute: () => {
        const blocks = blocksInSelection();
        if (blocks.length === 0) return;
        const isActive = blocks.every((block) => block.style.textAlign === 'justify');
        for (const block of blocks) {
          if (isActive) {
            block.style.removeProperty('text-align');
            if (!block.getAttribute('style')) block.removeAttribute('style');
          } else {
            block.style.textAlign = 'justify';
          }
        }
        editor.events.emit('change', { source: 'user' });
      },
      isEnabled: () => true,
    });
    registerExecCommand(editor, 'bulletList', 'insertUnorderedList');
    registerExecCommand(editor, 'orderedList', 'insertOrderedList');
    editor.commands.register('formatBlock', {
      execute: (_context, payload) => {
        document.execCommand('formatBlock', false, payload);
        editor.events.emit('change', { source: 'user' });
      },
      isEnabled: () => true,
    });
    editor.commands.register('blockquote', {
      // Toggle: apply blockquote, or revert to a plain paragraph if the
      // current block is already a blockquote.
      execute: () => {
        const isActive = document.queryCommandValue('formatBlock').toLowerCase() === 'blockquote';
        document.execCommand('formatBlock', false, isActive ? 'p' : 'blockquote');
        editor.events.emit('change', { source: 'user' });
      },
      isEnabled: () => true,
    });
    editor.commands.register('codeBlock', {
      // Toggle: apply a <pre> code block, or revert to a plain paragraph if
      // the current block is already a code block. Same pattern as
      // `blockquote` above.
      execute: () => {
        const isActive = document.queryCommandValue('formatBlock').toLowerCase() === 'pre';
        document.execCommand('formatBlock', false, isActive ? 'p' : 'pre');
        editor.events.emit('change', { source: 'user' });
      },
      isEnabled: () => true,
    });
    // Applies { url, text } from the link panel (main.js) to the current
    // selection: updates the enclosing <a> in place if the selection is
    // already inside one, otherwise wraps/replaces the selection in a new
    // <a>. Driven by the panel rather than execCommand('createLink') so the
    // displayed text can be set/edited independently of the URL.
    editor.commands.register('link', {
      execute: (_context, payload) => {
        const url = sanitizeLinkUrl(payload?.url);
        if (!url) return;
        const text = payload.text?.trim() || url;
        const selection = document.getSelection();
        if (!selection || selection.rangeCount === 0) return;
        const range = selection.getRangeAt(0);

        const existingLink = closestLink(range.startContainer);
        if (existingLink) {
          existingLink.setAttribute('href', url);
          existingLink.textContent = text;
        } else {
          range.deleteContents();
          const anchor = document.createElement('a');
          anchor.setAttribute('href', url);
          anchor.textContent = text;
          range.insertNode(anchor);
          range.setStartAfter(anchor);
          range.setEndAfter(anchor);
          selection.removeAllRanges();
          selection.addRange(range);
        }
        editor.events.emit('change', { source: 'user' });
      },
      isEnabled: () => true,
    });
    editor.commands.register('unlink', {
      execute: () => {
        const selection = document.getSelection();
        const existingLink = selection?.anchorNode ? closestLink(selection.anchorNode) : null;
        if (!existingLink) return;
        const parent = existingLink.parentNode;
        while (existingLink.firstChild) parent.insertBefore(existingLink.firstChild, existingLink);
        parent.removeChild(existingLink);
        editor.events.emit('change', { source: 'user' });
      },
      isEnabled: () => true,
    });
    // Inserts raw markup from the HTML panel (main.js) at the current
    // selection, replacing whatever's selected. Unlike the "Source" toggle
    // (which swaps the whole document for its HTML), this only ever touches
    // the caret position, so it's driven by DOM insertion rather than
    // execCommand('insertHTML') — same rationale as `link` above.
    editor.commands.register('insertHtml', {
      execute: (_context, payload) => {
        const html = (payload?.html || '').trim();
        if (!html) return;
        const selection = document.getSelection();
        if (!selection || selection.rangeCount === 0) return;
        const range = selection.getRangeAt(0);
        range.deleteContents();

        const template = document.createElement('template');
        template.innerHTML = html;
        const fragment = template.content;
        if (!fragment.hasChildNodes()) return;
        const lastNode = fragment.lastChild;

        const insertsBlock = Array.from(fragment.childNodes).some(
          (node) => node.nodeType === Node.ELEMENT_NODE && BLOCK_LEVEL_TAGS.has(node.tagName),
        );
        const containerEl =
          range.startContainer.nodeType === Node.ELEMENT_NODE
            ? range.startContainer
            : range.startContainer.parentElement;
        const root = containerEl?.closest('[contenteditable]');
        const block = root ? closestTopLevelBlock(range.startContainer, root) : null;

        if (insertsBlock && block) {
          // Split the current block at the caret — the same thing pressing
          // Enter does — so the inserted block(s) land as siblings instead
          // of nesting inside it.
          const tail = block.cloneNode(false);
          const tailRange = document.createRange();
          tailRange.setStart(range.startContainer, range.startOffset);
          tailRange.setEnd(block, block.childNodes.length);
          tail.appendChild(tailRange.extractContents());
          if (!tail.hasChildNodes()) tail.appendChild(document.createElement('br'));
          block.after(tail);
          block.after(fragment);
        } else {
          range.insertNode(fragment);
        }

        const caretRange = document.createRange();
        caretRange.setStartAfter(lastNode);
        caretRange.collapse(true);
        selection.removeAllRanges();
        selection.addRange(caretRange);
        editor.events.emit('change', { source: 'user' });
      },
      isEnabled: () => true,
    });
  },
  destroy({ editor }) {
    editor.commands.unregister('bold');
    editor.commands.unregister('italic');
    editor.commands.unregister('underline');
    editor.commands.unregister('strikethrough');
    editor.commands.unregister('alignLeft');
    editor.commands.unregister('alignCenter');
    editor.commands.unregister('alignRight');
    editor.commands.unregister('alignJustify');
    editor.commands.unregister('bulletList');
    editor.commands.unregister('orderedList');
    editor.commands.unregister('formatBlock');
    editor.commands.unregister('blockquote');
    editor.commands.unregister('codeBlock');
    editor.commands.unregister('link');
    editor.commands.unregister('unlink');
    editor.commands.unregister('insertHtml');
  },
};

/**
 * Reads which formatting commands are "active" at the current selection, for
 * driving toolbar button highlighting. This is UI-only state, deliberately
 * kept separate from `Command.isEnabled` (which answers "can this run", not
 * "is this currently on") — see `formattingPlugin` above.
 */
export function readActiveFormats() {
  const block = document.queryCommandValue('formatBlock').toLowerCase();
  const selection = document.getSelection();
  return {
    bold: document.queryCommandState('bold'),
    italic: document.queryCommandState('italic'),
    underline: document.queryCommandState('underline'),
    strikethrough: document.queryCommandState('strikeThrough'),
    alignLeft: (() => {
      const blocks = blocksInSelection();
      return blocks.length > 0 && blocks.every((block) => block.style.textAlign === 'left');
    })(),
    alignCenter: (() => {
      const blocks = blocksInSelection();
      return blocks.length > 0 && blocks.every((block) => block.style.textAlign === 'center');
    })(),
    alignRight: (() => {
      const blocks = blocksInSelection();
      return blocks.length > 0 && blocks.every((block) => block.style.textAlign === 'right');
    })(),
    alignJustify: (() => {
      const blocks = blocksInSelection();
      return blocks.length > 0 && blocks.every((block) => block.style.textAlign === 'justify');
    })(),
    blockquote: block === 'blockquote',
    codeBlock: block === 'pre',
    bulletList: document.queryCommandState('insertUnorderedList'),
    orderedList: document.queryCommandState('insertOrderedList'),
    link: Boolean(selection?.anchorNode && closestLink(selection.anchorNode)),
    formatBlock: BLOCK_FORMATS.includes(block) ? block : 'p',
  };
}
