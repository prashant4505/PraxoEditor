/**
 * A generic, strongly-typed publish/subscribe emitter.
 *
 * This is intentionally editor-agnostic: it knows nothing about documents,
 * commands, or plugins. `@praxo/core` builds its typed `EditorEventMap` on
 * top of this class rather than reimplementing pub/sub.
 *
 * `EventMap` is intentionally constrained to `object` rather than
 * `Record<string, unknown>` — that keeps it usable both with plain index
 * signatures and with plugin-augmentable interfaces (see
 * `EditorEventMap` in `@praxo/core`), which are not structurally assignable
 * to `Record<string, unknown>` even though every property value is `unknown`-compatible.
 *
 * @typeParam EventMap - A type mapping event names to their listener payload type.
 */
export class EventEmitter<EventMap extends object> {
  private readonly listeners = new Map<keyof EventMap, Set<(payload: never) => void>>();

  /**
   * Registers a listener for `event`.
   *
   * @returns An unsubscribe function. Prefer this over calling `off` manually.
   */
  public on<Event extends keyof EventMap>(
    event: Event,
    listener: (payload: EventMap[Event]) => void,
  ): () => void {
    const set = this.listeners.get(event) ?? new Set();
    set.add(listener as (payload: never) => void);
    this.listeners.set(event, set);
    return () => this.off(event, listener);
  }

  /**
   * Registers a listener that automatically unsubscribes after the first call.
   */
  public once<Event extends keyof EventMap>(
    event: Event,
    listener: (payload: EventMap[Event]) => void,
  ): () => void {
    const off = this.on(event, (payload) => {
      off();
      listener(payload);
    });
    return off;
  }

  /**
   * Removes a previously registered listener. No-op if it was never registered.
   */
  public off<Event extends keyof EventMap>(
    event: Event,
    listener: (payload: EventMap[Event]) => void,
  ): void {
    this.listeners.get(event)?.delete(listener as (payload: never) => void);
  }

  /**
   * Synchronously invokes every listener registered for `event`.
   *
   * A listener that throws does not prevent the remaining listeners from
   * running — mirroring how the native DOM `EventTarget` handles a throwing
   * listener, the error is reported via `console.error` rather than
   * stopping dispatch or being silently swallowed.
   */
  public emit<Event extends keyof EventMap>(event: Event, payload: EventMap[Event]): void {
    const set = this.listeners.get(event);
    if (!set) return;
    for (const listener of [...set]) {
      try {
        (listener as (payload: EventMap[Event]) => void)(payload);
      } catch (error) {
        console.error(error);
      }
    }
  }

  /**
   * Removes all listeners for `event`, or every listener for every event
   * when called with no arguments.
   */
  public removeAllListeners<Event extends keyof EventMap>(event?: Event): void {
    if (event === undefined) {
      this.listeners.clear();
      return;
    }
    this.listeners.delete(event);
  }

  /**
   * Number of listeners currently registered for `event`.
   */
  public listenerCount<Event extends keyof EventMap>(event: Event): number {
    return this.listeners.get(event)?.size ?? 0;
  }
}
