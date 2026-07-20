import { describe, expect, it, vi } from 'vitest';
import { EventBus } from '../src/events/event-bus.js';

describe('EventBus', () => {
  it('delivers known editor events with their typed payload', () => {
    const bus = new EventBus();
    const listener = vi.fn();
    bus.on('change', listener);

    bus.emit('change', { source: 'user' });

    expect(listener).toHaveBeenCalledExactlyOnceWith({ source: 'user' });
  });

  it('supports events with no payload', () => {
    const bus = new EventBus();
    const listener = vi.fn();
    bus.on('undo', listener);

    bus.emit('undo', undefined);

    expect(listener).toHaveBeenCalledTimes(1);
  });

  it('isolates listeners across independent instances', () => {
    const first = new EventBus();
    const second = new EventBus();
    const listener = vi.fn();
    first.on('focus', listener);

    second.emit('focus', undefined);

    expect(listener).not.toHaveBeenCalled();
  });
});
