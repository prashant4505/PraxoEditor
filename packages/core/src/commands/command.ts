import type { PraxoEditor } from '../editor/praxo-editor.js';

/** Context passed to every command invocation. */
export interface CommandContext {
  readonly editor: PraxoEditor;
}

/**
 * A single, named, undoable-in-spirit unit of editor behavior.
 *
 * Commands are the *only* sanctioned way to mutate editor state — plugins
 * register them via `editor.commands.register(name, command)` and host
 * applications trigger them via `editor.execute(name, payload)`. This
 * indirection is what lets toolbar buttons, keyboard shortcuts, and
 * programmatic calls all share one implementation and one enabled/disabled
 * state.
 *
 * @typeParam Payload - Argument type accepted by `execute`. Defaults to
 * `void` for commands that take no argument, e.g. `bold`.
 */
export interface Command<Payload = void> {
  /** Performs the command's effect. */
  execute(context: CommandContext, payload: Payload): void;

  /**
   * Whether the command can currently run, e.g. `false` for `redo` when
   * there is nothing to redo. Commands without meaningful enabled/disabled
   * state may omit this — they are always considered enabled.
   */
  isEnabled?(context: CommandContext): boolean;
}
