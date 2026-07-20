import { beforeEach, describe, expect, it, vi } from 'vitest';
import { PraxoEditor } from '../src/editor/praxo-editor.js';
import { PraxoError } from '../src/errors/praxo-error.js';

describe('PraxoEditor', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  it('resolves the host element from a CSS selector', () => {
    document.body.innerHTML = '<div id="editor"></div>';

    const editor = new PraxoEditor({ element: '#editor' });

    expect(document.querySelector('#editor')?.hasAttribute('data-praxo-editor')).toBe(true);
    editor.destroy();
  });

  it('accepts an HTMLElement directly', () => {
    const host = document.createElement('div');
    document.body.appendChild(host);

    const editor = new PraxoEditor({ element: host });

    expect(host.hasAttribute('data-praxo-editor')).toBe(true);
    editor.destroy();
  });

  it('throws ELEMENT_NOT_FOUND for a selector that matches nothing', () => {
    expect(() => new PraxoEditor({ element: '#does-not-exist' })).toThrow(PraxoError);
  });

  it('applies the placeholder as a data attribute', () => {
    document.body.innerHTML = '<div id="editor"></div>';

    const editor = new PraxoEditor({ element: '#editor', placeholder: 'Start typing...' });

    expect(document.querySelector('#editor')?.getAttribute('data-praxo-placeholder')).toBe(
      'Start typing...',
    );
    editor.destroy();
  });

  it('adopts existing markup inside the element when no initial data is given', () => {
    document.body.innerHTML = '<div id="editor"><p>Existing</p></div>';

    const editor = new PraxoEditor({ element: '#editor' });

    expect(editor.getData()).toBe('<p>Existing</p>');
    editor.destroy();
  });

  it('setData() replaces content and getData() reads it back', () => {
    document.body.innerHTML = '<div id="editor"></div>';
    const editor = new PraxoEditor({ element: '#editor' });

    editor.setData('<p>Hello</p>');

    expect(editor.getData()).toBe('<p>Hello</p>');
    editor.destroy();
  });

  it('setData() emits a change event with source "api"', () => {
    document.body.innerHTML = '<div id="editor"></div>';
    const editor = new PraxoEditor({ element: '#editor' });
    const listener = vi.fn();
    editor.events.on('change', listener);

    editor.setData('<p>Hi</p>');

    expect(listener).toHaveBeenCalledExactlyOnceWith({ source: 'api' });
    editor.destroy();
  });

  it('installs plugins passed in the config, in order', () => {
    document.body.innerHTML = '<div id="editor"></div>';
    const order: string[] = [];

    const editor = new PraxoEditor({
      element: '#editor',
      plugins: [
        { name: 'a', init: () => order.push('a') },
        { name: 'b', init: () => order.push('b') },
      ],
    });

    expect(order).toEqual(['a', 'b']);
    expect(editor.plugins.names).toEqual(['a', 'b']);
    editor.destroy();
  });

  it('execute() runs a registered command', () => {
    document.body.innerHTML = '<div id="editor"></div>';
    const editor = new PraxoEditor({ element: '#editor' });
    const execute = vi.fn();
    editor.commands.register('noop', { execute });

    editor.execute('noop');

    expect(execute).toHaveBeenCalledTimes(1);
    editor.destroy();
  });

  it('destroy() is idempotent', () => {
    document.body.innerHTML = '<div id="editor"></div>';
    const editor = new PraxoEditor({ element: '#editor' });

    editor.destroy();

    expect(() => editor.destroy()).not.toThrow();
    expect(editor.isDestroyed).toBe(true);
  });

  it('rejects further use after destroy()', () => {
    document.body.innerHTML = '<div id="editor"></div>';
    const editor = new PraxoEditor({ element: '#editor' });

    editor.destroy();

    expect(() => editor.getData()).toThrow(PraxoError);
    expect(() => editor.setData('<p>x</p>')).toThrow(PraxoError);
    expect(() => editor.execute('noop')).toThrow(PraxoError);
    expect(() => editor.use({ name: 'x', init: () => {} })).toThrow(PraxoError);
  });

  it('destroy() removes all event listeners', () => {
    document.body.innerHTML = '<div id="editor"></div>';
    const editor = new PraxoEditor({ element: '#editor' });
    const listener = vi.fn();
    editor.events.on('focus', listener);

    editor.destroy();
    editor.events.emit('focus', undefined);

    expect(listener).not.toHaveBeenCalled();
  });
});
