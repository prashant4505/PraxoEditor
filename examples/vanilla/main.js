// Imports the built ESM bundle directly — no bundler required for this example.
// Run `npm run build` at the repo root first so packages/core/dist exists,
// and serve this file over http(s):// (not file://) since browsers block
// module imports from the local filesystem.

const logEl = document.getElementById('log');
function log(message) {
  logEl.textContent += `${message}\n`;
}

function showFatalError(message) {
  const banner = document.createElement('pre');
  banner.id = 'fatal-error';
  banner.style.cssText =
    'white-space: pre-wrap; color: #b00020; background: #fdecea; border: 1px solid #f5c2c7; ' +
    'border-radius: 6px; padding: 0.75rem 1rem; margin-bottom: 1rem;';
  banner.textContent = message;
  document.body.insertBefore(banner, document.body.firstChild);
}

let PraxoEditor;
try {
  ({ PraxoEditor } = await import('../../packages/core/dist/editor.esm.js'));
} catch (error) {
  showFatalError(
    'Failed to load @praxo/core.\n\n' +
      'This usually means one of:\n' +
      '  1. `npm run build` has not been run yet (packages/core/dist is missing).\n' +
      '  2. This page was opened directly as a file:// URL — serve it over http(s)\n' +
      '     instead, e.g. `npm run example` from the repo root, or `npx serve .`\n' +
      '     rooted at the repo root.\n\n' +
      `Original error: ${error.message}`,
  );
  throw error;
}

const { formattingPlugin, readActiveFormats, closestLink, sanitizeLinkUrl } = await import(
  './formatting-plugin.js'
);

const editor = new PraxoEditor({
  element: '#editor',
  placeholder: 'Start typing...',
  data: '<p>Hello from Praxo Editor.</p>',
  plugins: [formattingPlugin],
});

editor.commands.register('sayHello', {
  execute: () => log('sayHello command executed'),
});

const toolbarButtons = document.querySelectorAll('#toolbar button[data-command]');
for (const button of toolbarButtons) {
  // Prevent the editor from losing focus/selection when the toolbar button
  // is pressed — without this, execCommand would have nothing to act on.
  button.addEventListener('mousedown', (event) => event.preventDefault());
  button.addEventListener('click', () => {
    if (button.dataset.command === 'link') {
      openLinkPanel();
      return;
    }
    editor.execute(button.dataset.command);
    updateToolbarState();
  });
}

const blockFormatSelect = document.getElementById('block-format');
// Unlike the toolbar buttons, we can't preventDefault the select's mousedown
// (that would stop its native dropdown from opening), so opening it steals
// focus/selection from the editor. Save the selection right before that
// happens and restore it on change, so formatBlock still applies to the
// right place.
let savedRange = null;
blockFormatSelect.addEventListener('mousedown', () => {
  const selection = document.getSelection();
  savedRange = selection && selection.rangeCount > 0 ? selection.getRangeAt(0).cloneRange() : null;
});
blockFormatSelect.addEventListener('change', () => {
  if (savedRange) {
    const selection = document.getSelection();
    selection.removeAllRanges();
    selection.addRange(savedRange);
  }
  editor.execute('formatBlock', blockFormatSelect.value);
  updateToolbarState();
});

function updateToolbarState() {
  const active = readActiveFormats();
  for (const button of toolbarButtons) {
    button.classList.toggle('active', Boolean(active[button.dataset.command]));
  }
  blockFormatSelect.value = active.formatBlock;
}

document.addEventListener('selectionchange', updateToolbarState);

// "Source" view: swaps the editable surface for a plain <textarea> showing
// the raw HTML (tags and all) behind the current content. Toggling back off
// writes any edits back into the editor via setData().
const editorEl = document.getElementById('editor');
const sourceView = document.getElementById('source-view');
const sourceToggle = document.getElementById('source-toggle');
let inSourceMode = false;

// Link panel: a small CKEditor-style popover (title, "Displayed text" and
// "Link URL" fields, Insert button) shown in place of the old
// window.prompt()-based flow, so entering a URL doesn't spawn a blocking
// native dialog. Opened by the toolbar's "Link" button; closed on Insert,
// Remove link, outside click, or Escape.
const linkPanel = document.getElementById('link-panel');
const linkTextInput = document.getElementById('link-text-input');
const linkUrlInput = document.getElementById('link-url-input');
const linkInsertBtn = document.getElementById('link-insert-btn');
const linkUnlinkBtn = document.getElementById('link-unlink-btn');
const linkButton = document.querySelector('#toolbar button[data-command="link"]');

// Selection is lost as soon as focus moves into the panel's inputs, so save
// it on open and restore it right before applying — same technique as
// `savedRange` above for the block-format select.
let linkSavedRange = null;

function closeLinkPanel() {
  linkPanel.hidden = true;
  linkSavedRange = null;
}

function openLinkPanel() {
  const selection = document.getSelection();
  let range =
    selection && selection.rangeCount > 0 && editorEl.contains(selection.getRangeAt(0).commonAncestorContainer)
      ? selection.getRangeAt(0)
      : null;
  if (!range) {
    // No active selection inside the editor (e.g. button clicked without
    // having typed yet) — place the caret at the end of the content.
    editorEl.focus();
    range = document.createRange();
    range.selectNodeContents(editorEl);
    range.collapse(false);
    selection.removeAllRanges();
    selection.addRange(range);
  }
  linkSavedRange = range.cloneRange();

  const existingLink = closestLink(range.startContainer);
  linkTextInput.value = existingLink ? existingLink.textContent : selection.toString();
  linkUrlInput.value = existingLink ? existingLink.getAttribute('href') : '';
  linkUnlinkBtn.hidden = !existingLink;

  const rect = range.getBoundingClientRect();
  const anchorRect = rect.width || rect.height ? rect : editorEl.getBoundingClientRect();
  linkPanel.hidden = false;
  linkPanel.style.top = `${anchorRect.bottom + 6}px`;
  linkPanel.style.left = `${anchorRect.left}px`;
  linkUrlInput.focus();
}

function restoreLinkSelection() {
  if (!linkSavedRange) return;
  const selection = document.getSelection();
  selection.removeAllRanges();
  selection.addRange(linkSavedRange);
}

linkInsertBtn.addEventListener('click', () => {
  const url = sanitizeLinkUrl(linkUrlInput.value);
  if (!url) {
    linkUrlInput.focus();
    return;
  }
  restoreLinkSelection();
  editor.execute('link', { url, text: linkTextInput.value });
  closeLinkPanel();
  updateToolbarState();
});

linkUnlinkBtn.addEventListener('click', () => {
  restoreLinkSelection();
  editor.execute('unlink');
  closeLinkPanel();
  updateToolbarState();
});

document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape' && !linkPanel.hidden) closeLinkPanel();
});
document.addEventListener('mousedown', (event) => {
  if (!linkPanel.hidden && !linkPanel.contains(event.target) && event.target !== linkButton) {
    closeLinkPanel();
  }
});

sourceToggle.addEventListener('click', () => {
  inSourceMode = !inSourceMode;
  sourceToggle.classList.toggle('active', inSourceMode);
  blockFormatSelect.disabled = inSourceMode;
  for (const button of toolbarButtons) {
    button.disabled = inSourceMode;
  }
  closeLinkPanel();

  if (inSourceMode) {
    sourceView.value = editor.getData();
    editorEl.classList.add('hidden');
    sourceView.classList.add('visible');
    sourceView.focus();
  } else {
    editor.setData(sourceView.value);
    sourceView.classList.remove('visible');
    editorEl.classList.remove('hidden');
    updateToolbarState();
  }
});

editor.events.on('change', ({ source }) => log(`change event (source: ${source})`));
editor.events.on('pluginLoaded', ({ name }) => log(`plugin loaded: ${name}`));

document.getElementById('run-command').addEventListener('click', () => {
  editor.execute('sayHello');
});

document.getElementById('log-data').addEventListener('click', () => {
  log(`getData(): ${editor.getData()}`);
});

document.getElementById('destroy').addEventListener('click', () => {
  editor.destroy();
  log('editor destroyed');
});
