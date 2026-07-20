import { beforeEach, describe, expect, it, vi } from 'vitest';
import { PraxoEditor } from '../src/editor/praxo-editor.js';
import { PraxoError } from '../src/errors/praxo-error.js';
import type { Plugin } from '../src/plugins/plugin.js';

describe('PluginManager', () => {
  let editor: PraxoEditor;

  beforeEach(() => {
    document.body.innerHTML = '<div id="editor"></div>';
    editor = new PraxoEditor({ element: '#editor' });
  });

  function makePlugin(name: string, overrides: Partial<Plugin> = {}): Plugin {
    return { name, init: vi.fn(), destroy: vi.fn(), ...overrides };
  }

  it('calls init() and tracks the plugin as installed', () => {
    const plugin = makePlugin('bold');

    editor.use(plugin);

    expect(plugin.init).toHaveBeenCalledExactlyOnceWith({ editor });
    expect(editor.plugins.has('bold')).toBe(true);
  });

  it('emits pluginLoaded on install', () => {
    const listener = vi.fn();
    editor.events.on('pluginLoaded', listener);

    editor.use(makePlugin('bold'));

    expect(listener).toHaveBeenCalledExactlyOnceWith({ name: 'bold' });
  });

  it('throws PLUGIN_ALREADY_INSTALLED for a duplicate name', () => {
    editor.use(makePlugin('bold'));

    expect(() => editor.use(makePlugin('bold'))).toThrow(PraxoError);
  });

  it('throws PLUGIN_DEPENDENCY_MISSING when a dependency is not installed', () => {
    const plugin = makePlugin('table', { dependencies: ['list'] });

    expect(() => editor.use(plugin)).toThrow(PraxoError);
  });

  it('installs successfully once the dependency is present', () => {
    editor.use(makePlugin('list'));
    const table = makePlugin('table', { dependencies: ['list'] });

    editor.use(table);

    expect(editor.plugins.has('table')).toBe(true);
  });

  it('removePlugin() calls destroy() and emits pluginRemoved', () => {
    const plugin = makePlugin('bold');
    editor.use(plugin);
    const listener = vi.fn();
    editor.events.on('pluginRemoved', listener);

    editor.removePlugin('bold');

    expect(plugin.destroy).toHaveBeenCalledExactlyOnceWith({ editor });
    expect(listener).toHaveBeenCalledExactlyOnceWith({ name: 'bold' });
    expect(editor.plugins.has('bold')).toBe(false);
  });

  it('throws PLUGIN_HAS_DEPENDENTS when removing a plugin others depend on', () => {
    editor.use(makePlugin('list'));
    editor.use(makePlugin('table', { dependencies: ['list'] }));

    expect(() => editor.removePlugin('list')).toThrow(PraxoError);
  });

  it('throws PLUGIN_NOT_FOUND when removing a plugin that was never installed', () => {
    expect(() => editor.removePlugin('missing')).toThrow(PraxoError);
  });

  it('destroy() on the editor tears down every plugin without dependency checks', () => {
    const list = makePlugin('list');
    const table = makePlugin('table', { dependencies: ['list'] });
    editor.use(list);
    editor.use(table);

    editor.destroy();

    expect(list.destroy).toHaveBeenCalledTimes(1);
    expect(table.destroy).toHaveBeenCalledTimes(1);
  });
});
