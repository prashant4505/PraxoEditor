# @praxo/core

The core of [Praxo Editor](../../README.md): the `PraxoEditor` instance, its event bus, command
registry, and plugin system. Framework-agnostic — no React/Vue/Angular dependency, no jQuery.

> **Status:** Phase 1 foundation. `setData`/`getData` currently read and write the host element's
> `innerHTML` directly. Phase 2 introduces an internal document model that `PraxoEditor` will
> serialize to/from instead — the public API here is designed not to change when that lands.

## Install

```bash
npm install @praxo/core
```

## Quick start

```ts
import { PraxoEditor } from '@praxo/core';

const editor = new PraxoEditor({
  element: '#editor',
  placeholder: 'Start typing...',
});

editor.setData('<p>Hello</p>');
editor.getData(); // '<p>Hello</p>'

editor.destroy();
```

## Plugins

```ts
import type { Plugin } from '@praxo/core';

const helloPlugin: Plugin = {
  name: 'hello',
  init({ editor }) {
    editor.commands.register('sayHello', {
      execute: () => console.log('Hello from Praxo!'),
    });
  },
  destroy({ editor }) {
    editor.commands.unregister('sayHello');
  },
};

editor.use(helloPlugin);
editor.execute('sayHello');
editor.removePlugin('hello');
```

Plugins declare `dependencies` (an array of other plugin names) to require ordering; installing a
plugin whose dependency isn't installed yet throws a `PraxoError` with code
`PLUGIN_DEPENDENCY_MISSING`.

## Events

```ts
editor.events.on('change', ({ source }) => {
  console.log(`content changed via ${source}`);
});
```

Built-in events: `change`, `selectionChange`, `focus`, `blur`, `paste`, `copy`, `cut`, `undo`,
`redo`, `pluginLoaded`, `pluginRemoved`. Add your own, fully typed, via declaration merging:

```ts
declare module '@praxo/core' {
  interface EditorEventMap {
    'myPlugin:activated': { readonly id: string };
  }
}
```

## Errors

All recoverable failures throw `PraxoError`, which carries a stable `.code` (e.g.
`ELEMENT_NOT_FOUND`, `COMMAND_NOT_FOUND`, `PLUGIN_ALREADY_INSTALLED`) so callers can branch on the
failure without parsing message strings.

## API

See [`docs/architecture.md`](../../docs/architecture.md) for the full design rationale, and the
inline JSDoc in `src/` for per-method documentation.
