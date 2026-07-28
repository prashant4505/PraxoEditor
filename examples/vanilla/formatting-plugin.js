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
  },
  destroy({ editor }) {
    editor.commands.unregister('bold');
    editor.commands.unregister('italic');
    editor.commands.unregister('underline');
    editor.commands.unregister('strikethrough');
    editor.commands.unregister('alignLeft');
    editor.commands.unregister('alignCenter');
    editor.commands.unregister('alignRight');
    editor.commands.unregister('bulletList');
    editor.commands.unregister('orderedList');
    editor.commands.unregister('formatBlock');
    editor.commands.unregister('blockquote');
    editor.commands.unregister('link');
    editor.commands.unregister('unlink');
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
    blockquote: block === 'blockquote',
    bulletList: document.queryCommandState('insertUnorderedList'),
    orderedList: document.queryCommandState('insertOrderedList'),
    link: Boolean(selection?.anchorNode && closestLink(selection.anchorNode)),
    formatBlock: BLOCK_FORMATS.includes(block) ? block : 'p',
  };
}
