import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { CommandRegistry } from '../src/commands/command-registry.js';
import { PraxoError } from '../src/errors/praxo-error.js';
import { PraxoEditor } from '../src/editor/praxo-editor.js';

describe('CommandRegistry', () => {
  let editor: PraxoEditor;
  let registry: CommandRegistry;

  beforeEach(() => {
    document.body.innerHTML = '<div id="editor"></div>';
    editor = new PraxoEditor({ element: '#editor' });
    registry = editor.commands;
  });

  it('registers and executes a command', () => {
    const execute = vi.fn();
    registry.register('greet', { execute });

    registry.execute('greet');

    expect(execute).toHaveBeenCalledExactlyOnceWith({ editor }, undefined);
  });

  it('passes the payload through to execute', () => {
    const execute = vi.fn();
    registry.register<{ text: string }>('insertText', { execute });

    registry.execute('insertText', { text: 'hello' });

    expect(execute).toHaveBeenCalledExactlyOnceWith({ editor }, { text: 'hello' });
  });

  it('throws COMMAND_NOT_FOUND when executing an unregistered command', () => {
    expect(() => registry.execute('missing')).toThrow(PraxoError);
    try {
      registry.execute('missing');
      expect.unreachable();
    } catch (error) {
      expect(error).toBeInstanceOf(PraxoError);
      expect((error as PraxoError).code).toBe('COMMAND_NOT_FOUND');
    }
  });

  it('throws COMMAND_ALREADY_REGISTERED on duplicate registration', () => {
    registry.register('bold', { execute: vi.fn() });

    expect(() => registry.register('bold', { execute: vi.fn() })).toThrow(PraxoError);
  });

  it('reports isEnabled() and refuses to execute disabled commands', () => {
    const execute = vi.fn();
    registry.register('redo', { execute, isEnabled: () => false });

    expect(registry.isEnabled('redo')).toBe(false);
    expect(() => registry.execute('redo')).toThrow(PraxoError);
    expect(execute).not.toHaveBeenCalled();
  });

  it('defaults isEnabled() to true when the command does not implement it', () => {
    registry.register('italic', { execute: vi.fn() });

    expect(registry.isEnabled('italic')).toBe(true);
  });

  it('unregister() removes a command and has() reflects it', () => {
    registry.register('bold', { execute: vi.fn() });
    expect(registry.has('bold')).toBe(true);

    registry.unregister('bold');

    expect(registry.has('bold')).toBe(false);
  });

  it('names lists every registered command', () => {
    registry.register('bold', { execute: vi.fn() });
    registry.register('italic', { execute: vi.fn() });

    expect(registry.names).toEqual(['bold', 'italic']);
  });
});
