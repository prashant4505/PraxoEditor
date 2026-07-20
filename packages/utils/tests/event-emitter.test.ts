import { describe, expect, it, vi } from 'vitest';
import { EventEmitter } from '../src/event-emitter.js';

interface TestEvents extends Record<string, unknown> {
  greet: { name: string };
  ping: undefined;
}

describe('EventEmitter', () => {
  it('invokes listeners registered for the emitted event', () => {
    const emitter = new EventEmitter<TestEvents>();
    const listener = vi.fn();
    emitter.on('greet', listener);

    emitter.emit('greet', { name: 'Praxo' });

    expect(listener).toHaveBeenCalledExactlyOnceWith({ name: 'Praxo' });
  });

  it('does not invoke listeners registered for other events', () => {
    const emitter = new EventEmitter<TestEvents>();
    const listener = vi.fn();
    emitter.on('greet', listener);

    emitter.emit('ping', undefined);

    expect(listener).not.toHaveBeenCalled();
  });

  it('supports multiple listeners for the same event', () => {
    const emitter = new EventEmitter<TestEvents>();
    const first = vi.fn();
    const second = vi.fn();
    emitter.on('ping', first);
    emitter.on('ping', second);

    emitter.emit('ping', undefined);

    expect(first).toHaveBeenCalledTimes(1);
    expect(second).toHaveBeenCalledTimes(1);
  });

  it('unsubscribes via the returned function', () => {
    const emitter = new EventEmitter<TestEvents>();
    const listener = vi.fn();
    const off = emitter.on('ping', listener);

    off();
    emitter.emit('ping', undefined);

    expect(listener).not.toHaveBeenCalled();
  });

  it('unsubscribes via off()', () => {
    const emitter = new EventEmitter<TestEvents>();
    const listener = vi.fn();
    emitter.on('ping', listener);

    emitter.off('ping', listener);
    emitter.emit('ping', undefined);

    expect(listener).not.toHaveBeenCalled();
  });

  it('once() fires exactly one time', () => {
    const emitter = new EventEmitter<TestEvents>();
    const listener = vi.fn();
    emitter.once('ping', listener);

    emitter.emit('ping', undefined);
    emitter.emit('ping', undefined);

    expect(listener).toHaveBeenCalledTimes(1);
  });

  it('removeAllListeners(event) clears only that event', () => {
    const emitter = new EventEmitter<TestEvents>();
    const greetListener = vi.fn();
    const pingListener = vi.fn();
    emitter.on('greet', greetListener);
    emitter.on('ping', pingListener);

    emitter.removeAllListeners('greet');
    emitter.emit('greet', { name: 'x' });
    emitter.emit('ping', undefined);

    expect(greetListener).not.toHaveBeenCalled();
    expect(pingListener).toHaveBeenCalledTimes(1);
  });

  it('removeAllListeners() with no arguments clears every event', () => {
    const emitter = new EventEmitter<TestEvents>();
    const greetListener = vi.fn();
    const pingListener = vi.fn();
    emitter.on('greet', greetListener);
    emitter.on('ping', pingListener);

    emitter.removeAllListeners();
    emitter.emit('greet', { name: 'x' });
    emitter.emit('ping', undefined);

    expect(greetListener).not.toHaveBeenCalled();
    expect(pingListener).not.toHaveBeenCalled();
  });

  it('listenerCount reflects registrations and removals', () => {
    const emitter = new EventEmitter<TestEvents>();
    expect(emitter.listenerCount('ping')).toBe(0);

    const off = emitter.on('ping', vi.fn());
    expect(emitter.listenerCount('ping')).toBe(1);

    off();
    expect(emitter.listenerCount('ping')).toBe(0);
  });

  it('a throwing listener does not stop later listeners from running', () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
    const emitter = new EventEmitter<TestEvents>();
    const error = new Error('boom');
    const later = vi.fn();
    emitter.on('ping', () => {
      throw error;
    });
    emitter.on('ping', later);

    expect(() => emitter.emit('ping', undefined)).not.toThrow();

    expect(later).toHaveBeenCalledTimes(1);
    expect(consoleError).toHaveBeenCalledExactlyOnceWith(error);
    consoleError.mockRestore();
  });
});
