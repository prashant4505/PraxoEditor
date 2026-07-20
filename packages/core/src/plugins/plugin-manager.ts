import { PraxoError } from '../errors/praxo-error.js';
import type { PraxoEditor } from '../editor/praxo-editor.js';
import type { Plugin, PluginContext } from './plugin.js';

/**
 * Owns plugin installation, removal, and dependency ordering for one editor
 * instance. Emits `pluginLoaded` / `pluginRemoved` on the editor's event bus
 * so other plugins (or host applications) can react to the editor's
 * capabilities changing at runtime.
 */
export class PluginManager {
  private readonly plugins = new Map<string, Plugin>();

  public constructor(private readonly editor: PraxoEditor) {}

  /**
   * Installs `plugin`, calling its `init` hook.
   *
   * @throws {PraxoError} `PLUGIN_ALREADY_INSTALLED` if a plugin with the
   * same name is already installed.
   * @throws {PraxoError} `PLUGIN_DEPENDENCY_MISSING` if a declared
   * dependency isn't installed yet — dependencies must be installed
   * explicitly and in order, Praxo does not resolve them automatically.
   */
  public use(plugin: Plugin): void {
    if (this.plugins.has(plugin.name)) {
      throw new PraxoError(
        `Plugin "${plugin.name}" is already installed.`,
        'PLUGIN_ALREADY_INSTALLED',
      );
    }
    for (const dependency of plugin.dependencies ?? []) {
      if (!this.plugins.has(dependency)) {
        throw new PraxoError(
          `Plugin "${plugin.name}" requires "${dependency}" to be installed first.`,
          'PLUGIN_DEPENDENCY_MISSING',
        );
      }
    }

    plugin.init(this.context());
    this.plugins.set(plugin.name, plugin);
    this.editor.events.emit('pluginLoaded', { name: plugin.name });
  }

  /**
   * Removes the plugin named `name`, calling its `destroy` hook.
   *
   * @throws {PraxoError} `PLUGIN_NOT_FOUND` if no plugin with that name is installed.
   * @throws {PraxoError} `PLUGIN_HAS_DEPENDENTS` if another installed plugin
   * depends on it — remove the dependent first.
   */
  public remove(name: string): void {
    const plugin = this.plugins.get(name);
    if (!plugin) {
      throw new PraxoError(`Plugin "${name}" is not installed.`, 'PLUGIN_NOT_FOUND');
    }

    const dependents = [...this.plugins.values()].filter((candidate) =>
      candidate.dependencies?.includes(name),
    );
    if (dependents.length > 0) {
      const names = dependents.map((dependent) => dependent.name).join(', ');
      throw new PraxoError(
        `Cannot remove "${name}": required by ${names}.`,
        'PLUGIN_HAS_DEPENDENTS',
      );
    }

    plugin.destroy?.(this.context());
    this.plugins.delete(name);
    this.editor.events.emit('pluginRemoved', { name });
  }

  /** Whether a plugin named `name` is currently installed. */
  public has(name: string): boolean {
    return this.plugins.has(name);
  }

  /** Retrieves an installed plugin by name, if present. */
  public get(name: string): Plugin | undefined {
    return this.plugins.get(name);
  }

  /** Names of every currently installed plugin, in installation order. */
  public get names(): readonly string[] {
    return [...this.plugins.keys()];
  }

  /**
   * Destroys every installed plugin without dependency checks or lifecycle
   * events. Reserved for `PraxoEditor.destroy()`, where the whole editor —
   * dependents included — is going away at once.
   */
  public destroyAll(): void {
    for (const name of [...this.plugins.keys()].reverse()) {
      this.plugins.get(name)?.destroy?.(this.context());
    }
    this.plugins.clear();
  }

  private context(): PluginContext {
    return { editor: this.editor };
  }
}
