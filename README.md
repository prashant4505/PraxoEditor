# Praxo Editor

A production-grade, framework-agnostic rich text editor for the web. TypeScript, ESM,
tree-shakeable, extensible entirely through plugins.

> **Status: Phase 1 (foundation).** The editor instance, event system, command registry, and
> plugin system are implemented and tested. There is no document model, editable area, or
> formatting features yet — see [Roadmap](#roadmap).

Praxo works with:

- Vanilla JavaScript
- Drupal
- Laravel
- React
- Vue
- Angular

No jQuery. No framework runtime dependency. MIT licensed.

## Packages

| Package | Description | Status |
| --- | --- | --- |
| [`@praxo/utils`](packages/utils) | Framework-agnostic primitives (typed `EventEmitter`, id generation, assertions). | Phase 1 |
| [`@praxo/core`](packages/core) | `PraxoEditor` instance, event bus, command registry, plugin system. | Phase 1 |
| `@praxo/model` | Internal document model (`Document`, `Paragraph`, `Text`, ...). | Planned — Phase 2 |
| `@praxo/engine` | Editable area, selection manager, rendering (model → DOM and back). | Planned — Phase 2 |
| `@praxo/commands` | Shared command implementations used by formatting plugins. | Planned — Phase 3 |
| `@praxo/plugins` | Built-in plugins: Bold, Italic, Heading, List, Table, Image, ... | Planned — Phase 3 |
| `@praxo/ui` | Toolbar, dropdowns, and other chrome, generated from installed plugins. | Planned — Phase 2 |
| `@praxo/themes` | CSS custom-property based light/dark themes. | Planned — Phase 2/4 |
| `@praxo/icons` | Icon set used by built-in toolbar buttons. | Planned — Phase 3 |

Packages not yet listed with real code are intentionally absent from `packages/` — this repo does
not carry empty placeholder packages ahead of the phase that gives them content.

## Installation

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

editor.execute('someCommand');
editor.destroy();
```

See [`examples/vanilla`](examples/vanilla) for a runnable example. Framework-specific examples
(React, Vue, Angular, Drupal, Laravel) land alongside the editable area and UI packages in Phase 2,
once there is real editing behavior worth demonstrating in each.

## Running and testing the examples

```bash
npm install
npm run example
```

`npm run example` builds every package and serves the repo root at `http://localhost:5173/`. Open:

```
http://localhost:5173/examples/vanilla/
```

You should see an editor box pre-filled with "Hello from Praxo Editor.", a Bold / Italic / Heading
toolbar above it, and three buttons below it. To confirm everything works:

- Select some text and click **B**, **I**, or **H2** — the text should bold/italicize/become a
  heading, and the button should highlight while the selection has that formatting active.
- Click **Run "sayHello" command** — `sayHello command executed` appears in the log below.
- Click **Log getData()** — the editor's current HTML is logged, reflecting any formatting applied.
- Click **Destroy editor** — logs `editor destroyed`; the toolbar and typing stop having any effect
  afterwards.

Don't open `examples/vanilla/index.html` directly as a `file://` URL — browsers block ES module
imports from the local filesystem, so the editor will fail to load. If you do, or if you haven't
run `npm run build` yet, the page shows a red error banner explaining the fix instead of failing
silently.

See [`examples/vanilla/README.md`](examples/vanilla/README.md) for the manual build+serve steps,
and [`examples/vanilla/formatting-plugin.js`](examples/vanilla/formatting-plugin.js) for how the
toolbar is implemented as a plugin — note that it's a documented proof-of-concept built on
`document.execCommand`, not the real Phase 3 formatting architecture (see
[Roadmap](#roadmap)).

## Plugin guide

Everything beyond the core instance is a plugin:

```ts
import type { Plugin } from '@praxo/core';

const myPlugin: Plugin = {
  name: 'myPlugin',
  dependencies: [], // other plugin names required before this one installs
  init({ editor }) {
    editor.commands.register('myCommand', {
      execute: () => {
        /* ... */
      },
      isEnabled: () => true,
    });
    editor.events.on('change', () => {
      /* react to content changes */
    });
  },
  destroy({ editor }) {
    editor.commands.unregister('myCommand');
  },
};

editor.use(myPlugin);
editor.removePlugin('myPlugin');
```

Full guide: [`packages/core/README.md`](packages/core/README.md).

## Architecture

See [`docs/architecture.md`](docs/architecture.md) for the full design rationale — package
boundaries, the document-model-first editing philosophy, the plugin/command/event contracts, and
what's deferred to later phases and why.

## Development

This is an npm-workspaces monorepo.

```bash
npm install        # installs and links all packages
npm run build       # builds every package (tsup: ESM + CJS + minified + .d.ts)
npm test            # runs all unit tests (vitest)
npm run typecheck    # tsc --noEmit across every package
npm run lint         # eslint
npm run format       # prettier --write
```

## Contributing

1. Work incrementally, phase by phase — see [Roadmap](#roadmap). Don't implement features from a
   later phase inside an earlier one's PR.
2. Every module ships with JSDoc and unit tests; no placeholder implementations except code
   explicitly marked `TODO`.
3. Strict TypeScript (`strict`, `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`) — no
   `any` without a documented reason.
4. All editing behavior goes through plugins and commands, never by patching core directly.
5. `npm run lint && npm run typecheck && npm test` must pass before opening a PR.
6. Keep commits small and focused; don't bundle unrelated changes.

## Roadmap

- **Phase 1 — Foundation** ✅: architecture, build system, TypeScript config, linting, testing,
  editor instance, event system, plugin system, command registry.
- **Phase 2 — Editing surface**: editable area, selection manager, document model, undo/redo,
  clipboard, keyboard shortcuts, history, toolbar, themes scaffold.
- **Phase 3 — Formatting features**: bold, italic, underline, paragraph, headings, lists, links,
  images, tables, code block, blockquote, horizontal rule — each as a plugin.
- **Phase 4 — Ecosystem**: markdown, paste sanitizer, drag & drop, find/replace, word/character
  count, autosave, fullscreen, dark theme.

## License

MIT © Praxo Editor Contributors
