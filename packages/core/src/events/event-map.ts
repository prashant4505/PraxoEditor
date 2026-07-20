/** Payload emitted whenever the editor's data changes. */
export interface ChangeEventPayload {
  /** Whether the change originated from user editing or a `setData()` call. */
  readonly source: 'user' | 'api';
}

/** Payload emitted when the document selection changes. */
export interface SelectionChangeEventPayload {
  /** The native browser event that triggered the selection change, if any. */
  readonly nativeEvent?: Event;
}

/** Payload shared by `paste`, `copy`, and `cut` events. */
export interface ClipboardEventPayload {
  readonly nativeEvent: ClipboardEvent;
}

/** Payload emitted for plugin lifecycle events. */
export interface PluginLifecycleEventPayload {
  readonly name: string;
}

/**
 * The canonical set of events the editor core emits.
 *
 * This is deliberately a plain `interface` with named keys rather than an
 * indexable `Record<string, unknown>` — a string index signature would
 * accept any typo silently and give every consumer `unknown` payloads.
 * Instead, plugin authors add their own strongly-typed events through
 * TypeScript's declaration merging:
 *
 * ```ts
 * declare module '@praxo/core' {
 *   interface EditorEventMap {
 *     'myPlugin:activated': { readonly id: string };
 *   }
 * }
 * ```
 *
 * Once merged, `editor.events.on('myPlugin:activated', ...)` is fully typed
 * for every consumer of the package, with no cast required.
 */
export interface EditorEventMap {
  change: ChangeEventPayload;
  selectionChange: SelectionChangeEventPayload;
  focus: undefined;
  blur: undefined;
  paste: ClipboardEventPayload;
  copy: ClipboardEventPayload;
  cut: ClipboardEventPayload;
  undo: undefined;
  redo: undefined;
  pluginLoaded: PluginLifecycleEventPayload;
  pluginRemoved: PluginLifecycleEventPayload;
}
