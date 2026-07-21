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

export const formattingPlugin = {
  name: 'formattingPoc',
  init({ editor }) {
    registerExecCommand(editor, 'bold', 'bold');
    registerExecCommand(editor, 'italic', 'italic');
    editor.commands.register('heading', {
      execute: () => {
        const current = document.queryCommandValue('formatBlock').toLowerCase();
        document.execCommand('formatBlock', false, current === 'h2' ? 'p' : 'h2');
        editor.events.emit('change', { source: 'user' });
      },
      isEnabled: () => true,
    });
  },
  destroy({ editor }) {
    editor.commands.unregister('bold');
    editor.commands.unregister('italic');
    editor.commands.unregister('heading');
  },
};

/**
 * Reads which formatting commands are "active" at the current selection, for
 * driving toolbar button highlighting. This is UI-only state, deliberately
 * kept separate from `Command.isEnabled` (which answers "can this run", not
 * "is this currently on") — see `formattingPlugin` above.
 */
export function readActiveFormats() {
  return {
    bold: document.queryCommandState('bold'),
    italic: document.queryCommandState('italic'),
    heading: document.queryCommandValue('formatBlock').toLowerCase() === 'h2',
  };
}
