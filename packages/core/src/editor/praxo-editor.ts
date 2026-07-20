import { CommandRegistry } from '../commands/command-registry.js';
import { PraxoError } from '../errors/praxo-error.js';
import { EventBus } from '../events/event-bus.js';
import { PluginManager } from '../plugins/plugin-manager.js';
import type { Plugin } from '../plugins/plugin.js';
import type { EditorConfig } from './editor-config.js';

/**
 * The public entry point of Praxo Editor.
 *
 * `PraxoEditor` itself is intentionally thin: it resolves the host element,
 * owns the {@link EventBus}, {@link CommandRegistry}, and
 * {@link PluginManager}, and exposes `setData`/`getData`/`execute`. All
 * editing behavior — formatting, the toolbar, undo/redo, and eventually the
 * document model itself — is added by plugins, not by this class.
 *
 * @example
 * ```ts
 * const editor = new PraxoEditor({
 *   element: '#editor',
 *   placeholder: 'Start typing...',
 * });
 * editor.setData('<p>Hello</p>');
 * editor.execute('bold');
 * editor.destroy();
 * ```
 */
export class PraxoEditor {
  /** Central pub/sub bus for editor-domain events. */
  public readonly events: EventBus;

  /** Registry of commands available via {@link PraxoEditor.execute}. */
  public readonly commands: CommandRegistry;

  /** Manager for installed plugins. */
  public readonly plugins: PluginManager;

  private readonly element: HTMLElement;
  private readonly config: EditorConfig;
  private destroyed = false;

  public constructor(config: EditorConfig) {
    this.config = config;
    this.element = resolveElement(config.element);
    this.events = new EventBus();
    this.commands = new CommandRegistry(this);
    this.plugins = new PluginManager(this);

    this.element.setAttribute('data-praxo-editor', '');
    if (this.config.placeholder) {
      this.element.setAttribute('data-praxo-placeholder', this.config.placeholder);
    }

    if (config.data !== undefined) {
      this.writeData(config.data);
    }

    for (const plugin of config.plugins ?? []) {
      this.use(plugin);
    }
  }

  /** Whether {@link PraxoEditor.destroy} has already been called on this instance. */
  public get isDestroyed(): boolean {
    return this.destroyed;
  }

  /**
   * Installs `plugin`. Shorthand for `editor.plugins.use(plugin)` that
   * additionally guards against use after {@link PraxoEditor.destroy}.
   */
  public use(plugin: Plugin): this {
    this.assertNotDestroyed();
    this.plugins.use(plugin);
    return this;
  }

  /** Removes a previously installed plugin by name. */
  public removePlugin(name: string): this {
    this.assertNotDestroyed();
    this.plugins.remove(name);
    return this;
  }

  /** Executes a registered command by name. Shorthand for `editor.commands.execute(name, payload)`. */
  public execute<Payload = void>(name: string, payload?: Payload): void {
    this.assertNotDestroyed();
    this.commands.execute(name, payload);
  }

  /**
   * Returns the editor's current content as an HTML string.
   *
   * This reads directly from the host element for now. Once the document
   * model (Phase 2) lands, this will serialize from the model instead —
   * the signature and behavior visible to callers won't change.
   */
  public getData(): string {
    this.assertNotDestroyed();
    return this.element.innerHTML;
  }

  /** Replaces the editor's content and emits a `change` event with `source: 'api'`. */
  public setData(html: string): void {
    this.assertNotDestroyed();
    this.writeData(html);
    this.events.emit('change', { source: 'api' });
  }

  /**
   * Tears down the editor: destroys every installed plugin, removes all
   * event listeners, and restores the host element's attributes. Safe to
   * call more than once — subsequent calls are no-ops.
   */
  public destroy(): void {
    if (this.destroyed) {
      return;
    }
    this.plugins.destroyAll();
    this.events.removeAllListeners();
    this.element.removeAttribute('data-praxo-editor');
    this.element.removeAttribute('data-praxo-placeholder');
    this.destroyed = true;
  }

  private writeData(html: string): void {
    this.element.innerHTML = html;
  }

  private assertNotDestroyed(): void {
    if (this.destroyed) {
      throw new PraxoError(
        'Cannot use this editor instance after destroy() has been called.',
        'ALREADY_DESTROYED',
      );
    }
  }
}

function resolveElement(target: string | HTMLElement): HTMLElement {
  if (typeof target !== 'string') {
    return target;
  }
  const found = document.querySelector<HTMLElement>(target);
  if (!found) {
    throw new PraxoError(`No element found for selector "${target}".`, 'ELEMENT_NOT_FOUND');
  }
  return found;
}
