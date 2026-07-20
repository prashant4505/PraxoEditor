import type { PraxoEditor } from '../editor/praxo-editor.js';

/** Context passed to a plugin's `init` and `destroy` hooks. */
export interface PluginContext {
  readonly editor: PraxoEditor;
}

/**
 * The unit of extensibility in Praxo Editor. Formatting features (bold,
 * headings, ...), UI (toolbar buttons), and cross-cutting behavior
 * (autosave, word count, ...) are all plugins — the core never special-cases
 * any of them.
 *
 * A plugin's `init` hook is where it registers commands, keyboard
 * shortcuts, toolbar entries, and event listeners against `context.editor`.
 * There is no separate registration API on the plugin object itself:
 * everything goes through the editor's public surface, which keeps a
 * plugin's capabilities exactly as large as a host application's.
 */
export interface Plugin {
  /** Unique plugin name, used for installation, removal, and dependency references. */
  readonly name: string;

  /** Names of plugins that must already be installed before this one. */
  readonly dependencies?: readonly string[];

  /** Called once, when the plugin is installed via `editor.use()`. */
  init(context: PluginContext): void;

  /** Called once, when the plugin is removed via `editor.removePlugin()` or the editor is destroyed. */
  destroy?(context: PluginContext): void;
}
