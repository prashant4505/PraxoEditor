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

export const formattingPlugin = {
  name: 'formattingPoc',
  init({ editor }) {
    registerExecCommand(editor, 'bold', 'bold');
    registerExecCommand(editor, 'italic', 'italic');
    registerExecCommand(editor, 'underline', 'underline');
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
  },
  destroy({ editor }) {
    editor.commands.unregister('bold');
    editor.commands.unregister('italic');
    editor.commands.unregister('underline');
    editor.commands.unregister('formatBlock');
    editor.commands.unregister('blockquote');
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
  return {
    bold: document.queryCommandState('bold'),
    italic: document.queryCommandState('italic'),
    underline: document.queryCommandState('underline'),
    blockquote: block === 'blockquote',
    formatBlock: BLOCK_FORMATS.includes(block) ? block : 'p',
  };
}
