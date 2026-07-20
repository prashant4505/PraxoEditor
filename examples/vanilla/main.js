// Imports the built ESM bundle directly — no bundler required for this example.
// Run `npm run build` at the repo root first so packages/core/dist exists.
import { PraxoEditor } from '../../packages/core/dist/editor.esm.js';

const logEl = document.getElementById('log');
function log(message) {
  logEl.textContent += `${message}\n`;
}

const editor = new PraxoEditor({
  element: '#editor',
  placeholder: 'Start typing...',
  data: '<p>Hello from Praxo Editor.</p>',
});

editor.commands.register('sayHello', {
  execute: () => log('sayHello command executed'),
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
