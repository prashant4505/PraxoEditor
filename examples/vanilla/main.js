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

const { formattingPlugin, readActiveFormats } = await import('./formatting-plugin.js');

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

sourceToggle.addEventListener('click', () => {
  inSourceMode = !inSourceMode;
  sourceToggle.classList.toggle('active', inSourceMode);
  blockFormatSelect.disabled = inSourceMode;
  for (const button of toolbarButtons) {
    button.disabled = inSourceMode;
  }

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
