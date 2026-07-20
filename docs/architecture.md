# Praxo Editor — Architecture Overview

This document explains the design of Praxo Editor's foundation (Phase 1) and the reasoning
behind it, so later phases extend it consistently rather than working around it.

## Goals that shaped the design

- **Framework-agnostic.** No React/Vue/Angular/jQuery dependency anywhere in `@praxo/core`. The
  editor owns a plain DOM element handed to it by the host; it never assumes how that host
  renders its own UI around it.
- **Extensible without touching core.** Every editing feature — formatting, toolbar buttons,
  autosave, whatever comes later — is a plugin. The core package should never need a new
  `if (pluginName === 'bold')` branch to support a new feature.
- **Strong typing over runtime flexibility.** Where the two trade off (see "Events" below), this
  project chooses compile-time safety.
- **Small, composable collaborators over one large class.** `PraxoEditor` delegates to
  `EventBus`, `CommandRegistry`, and `PluginManager` rather than absorbing their responsibilities.

## Package boundaries

```
@praxo/utils   → generic, editor-agnostic primitives (EventEmitter, uniqueId, assert)
@praxo/core    → PraxoEditor, EventBus, CommandRegistry, PluginManager, Plugin/Command contracts
```

`@praxo/core` depends on `@praxo/utils`; nothing depends on `@praxo/core` yet. This one-directional
dependency graph is intentional and will hold for later packages too:

```
utils → core → model → engine → { ui, commands, plugins } → themes / icons
```

A lower package must never import from a higher one. `@praxo/utils` in particular must stay free
of any DOM-editing or document-model concept — it is reused as-is by every future package.

`@praxo/utils` is bundled into `@praxo/core`'s published output (`noExternal` in `tsup.config.ts`)
rather than shipped as a separate runtime dependency consumers install. It is an implementation
detail of the monorepo, not part of the public package surface.

## Why no `engine/`, `model/`, `ui/`, ... packages yet

The requested top-level layout (`packages/{core,engine,model,ui,commands,plugins,themes,icons,utils}`)
is the target shape once every phase has landed. Creating those directories now, empty or with
stub exports, would violate "never generate placeholder code unless explicitly marked as TODO":
there is nothing for `@praxo/model` to model until Phase 2, and nothing for `@praxo/ui` to render
until there's a toolbar to generate. Each package is created in the iteration that gives it real,
tested content.

## The editor instance

`PraxoEditor` (`packages/core/src/editor/praxo-editor.ts`) is deliberately thin:

- Resolves the host element (selector or `HTMLElement`) and marks it with `data-praxo-editor`.
- Owns one `EventBus`, one `CommandRegistry`, one `PluginManager` — created once, never swapped.
- Installs any plugins passed in `config.plugins`, in order.
- Exposes `setData`/`getData`, `execute`, `use`/`removePlugin`, and `destroy`.

**Current limitation, by design:** `setData`/`getData` read and write `element.innerHTML`
directly. There is no document model yet (that's Phase 2's "Document Model" deliverable), so
there is nothing for these methods to serialize from/to. The signatures were chosen so that
swapping the implementation to serialize from an internal model later is not a breaking change —
callers already treat `getData()` as "the current content as HTML" and never touch the DOM
directly.

Calling any method after `destroy()` throws `PraxoError` with code `ALREADY_DESTROYED`. This is a
deliberate fail-fast choice over silently no-op-ing, since a host application calling methods on a
destroyed editor is almost always a lifecycle bug worth surfacing immediately.

## Events

`EventBus` (`packages/core/src/events/event-bus.ts`) is a thin, named specialization of
`@praxo/utils`'s generic `EventEmitter<EventMap>`, typed to `EditorEventMap`.

`EditorEventMap` is a plain `interface`, not an indexed `Record<string, unknown>`. The
brief asks the event system to "allow custom events"; the tempting implementation is a string
index signature (`[event: string]: unknown`), but that silently accepts typos (`'chnage'`
type-checks fine) and gives every event — built-in or custom — an `unknown` payload, defeating
"strong typing everywhere." Instead, custom events are added via TypeScript declaration merging:

```ts
declare module '@praxo/core' {
  interface EditorEventMap {
    'myPlugin:activated': { readonly id: string };
  }
}
```

This is the same mechanism TypeScript's own DOM types use for `HTMLElementEventMap`. Once merged,
`editor.events.on('myPlugin:activated', ...)` is fully typed for *every* consumer of the package —
not just the plugin that defined it — with no `as` cast anywhere. The cost is that a plugin author
must add a `declare module` block instead of just calling `emit('whatever', ...)`; that's the
correct trade for a library whose explicit priority is "strong typing everywhere."

`EventEmitter<EventMap>` itself is constrained to `EventMap extends object` rather than
`Record<string, unknown>` specifically so it works with both shapes — plain index-signature maps
(useful for internal/test code) and closed, augmentable interfaces like `EditorEventMap`.

Built-in events: `change`, `selectionChange`, `focus`, `blur`, `paste`, `copy`, `cut`, `undo`,
`redo`, `pluginLoaded`, `pluginRemoved`. Only `change`, `pluginLoaded`, and `pluginRemoved` are
actually emitted by Phase 1 code (`setData`/plugin install/remove) — the rest are reserved,
typed contracts for Phase 2, when there's an editable area and clipboard handling to fire them.

## Commands

`CommandRegistry` (`packages/core/src/commands/command-registry.ts`) is the single path through
which editor state changes: `editor.execute('bold')` looks up the command, checks
`isEnabled(context)` if implemented, and calls `execute(context, payload)`. Toolbar buttons,
keyboard shortcuts, and host-application calls all funnel through the same method — there is no
parallel "internal" mutation path a plugin could bypass this through.

`register`/`unregister` are per-instance (on `editor.commands`), not global, so multiple editor
instances on the same page never share or collide on command names.

Duplicate registration throws (`COMMAND_ALREADY_REGISTERED`) rather than silently overwriting —
two plugins racing to own the same command name is a configuration bug that should surface at
install time, not manifest as "my toolbar button now does the wrong thing" later.

## Plugins

`PluginManager` (`packages/core/src/plugins/plugin-manager.ts`) installs (`use`) and removes
(`remove`) plugins, enforcing:

- **Uniqueness** — one plugin per name per editor instance.
- **Explicit dependency order** — a plugin declaring `dependencies: ['list']` fails to install
  (`PLUGIN_DEPENDENCY_MISSING`) unless `list` is already installed. Praxo does not topologically
  sort or auto-install dependencies; the host application controls install order, which keeps
  plugin loading predictable and debuggable rather than "magic."
- **Safe removal** — removing a plugin other installed plugins depend on throws
  (`PLUGIN_HAS_DEPENDENTS`) instead of leaving dependents in a broken state.

A `Plugin` has no bespoke registration API of its own (no `plugin.registerCommand(...)`) — its
`init(context)` hook receives `{ editor }` and calls the *same* public methods a host application
would (`editor.commands.register`, `editor.events.on`, and eventually `editor.toolbar.register` in
Phase 2). This means a plugin's capabilities are always exactly as large as the public API
surface, never a privileged superset of it.

## Error handling

Two distinct error types, on purpose:

- `PraxoError` (`@praxo/core`) — recoverable, editor-domain failures: bad config, missing
  command/plugin, using a destroyed instance. Carries a stable string `code` union
  (`PraxoErrorCode`) so callers can `switch` on failure kind without parsing messages.
- `AssertionError` (`@praxo/utils`) — reserved for internal invariant violations (a bug in Praxo
  itself), via the `assert()` helper. Not currently thrown by any Phase 1 code path, but available
  to later packages (e.g. the document model) for invariants that should never be reachable
  through the public API.

## Testing & tooling choices

- **npm workspaces**, not pnpm/turborepo — Node's package manager already installed in every
  target environment (Drupal/Laravel hosting boxes included) can run this without an extra global
  install, and the monorepo is small enough that a dedicated task-orchestrator isn't earning its
  complexity yet.
- **tsup** for builds — thin wrapper around esbuild; produces ESM + CJS + a minified IIFE global
  build + rolled-up `.d.ts` from one config, with no bundler configuration of its own to maintain.
- **vitest** for tests — native ESM/TS support with no separate transpile step, Jest-compatible
  API.
- **ESLint flat config + typescript-eslint + Prettier** — current ESLint config format, with
  Prettier deferred to purely handle formatting (`eslint-config-prettier` disables the small
  overlap in rules).

## What's deliberately deferred

- **Document model** (`Document`, `Paragraph`, `Text`, `Heading`, ...) — Phase 2. Until it exists,
  `setData`/`getData` operate on the DOM directly, documented above as provisional.
- **Editable area, selection manager, undo/redo, clipboard, keyboard shortcuts** — Phase 2,
  built on top of the document model.
- **Toolbar** — Phase 2 UI package, generated from plugin registrations against a future
  `editor.toolbar` registry (not yet implemented — there is nothing to register yet).
- **Formatting plugins** (Bold, Italic, Heading, Lists, Links, Images, Tables, Code Block,
  Blockquote, HR) — Phase 3, each shipped as an independent `Plugin` in `@praxo/plugins`.
- **Markdown, paste sanitizer, drag & drop, find/replace, word/character count, autosave,
  fullscreen, dark theme** — Phase 4.
