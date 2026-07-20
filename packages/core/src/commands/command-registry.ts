import { PraxoError } from '../errors/praxo-error.js';
import type { PraxoEditor } from '../editor/praxo-editor.js';
import type { Command, CommandContext } from './command.js';

/**
 * Owns every command registered on an editor instance and mediates their
 * execution. One registry per `PraxoEditor`.
 */
export class CommandRegistry {
  private readonly commands = new Map<string, Command<never>>();

  public constructor(private readonly editor: PraxoEditor) {}

  /**
   * Registers `command` under `name`.
   *
   * @throws {PraxoError} `COMMAND_ALREADY_REGISTERED` if `name` is taken —
   * two plugins silently overwriting each other's commands is a bug, not a
   * feature, so this fails loudly instead.
   */
  public register<Payload = void>(name: string, command: Command<Payload>): void {
    if (this.commands.has(name)) {
      throw new PraxoError(
        `Command "${name}" is already registered.`,
        'COMMAND_ALREADY_REGISTERED',
      );
    }
    this.commands.set(name, command as Command<never>);
  }

  /** Removes a command. No-op if `name` was never registered. */
  public unregister(name: string): void {
    this.commands.delete(name);
  }

  /** Whether a command named `name` is currently registered. */
  public has(name: string): boolean {
    return this.commands.has(name);
  }

  /** Names of every currently registered command. */
  public get names(): readonly string[] {
    return [...this.commands.keys()];
  }

  /**
   * Whether `name` can currently be executed. Commands without an
   * `isEnabled` implementation are always enabled.
   *
   * @throws {PraxoError} `COMMAND_NOT_FOUND` if `name` isn't registered.
   */
  public isEnabled(name: string): boolean {
    const command = this.getOrThrow(name);
    return command.isEnabled ? command.isEnabled(this.context()) : true;
  }

  /**
   * Executes the command registered under `name`.
   *
   * @throws {PraxoError} `COMMAND_NOT_FOUND` if `name` isn't registered.
   * @throws {PraxoError} `COMMAND_DISABLED` if the command reports itself disabled.
   */
  public execute<Payload = void>(name: string, payload?: Payload): void {
    const command = this.getOrThrow(name);
    const context = this.context();
    if (command.isEnabled && !command.isEnabled(context)) {
      throw new PraxoError(
        `Command "${name}" is disabled and cannot be executed.`,
        'COMMAND_DISABLED',
      );
    }
    command.execute(context, payload as never);
  }

  private context(): CommandContext {
    return { editor: this.editor };
  }

  private getOrThrow(name: string): Command<never> {
    const command = this.commands.get(name);
    if (!command) {
      throw new PraxoError(`Command "${name}" is not registered.`, 'COMMAND_NOT_FOUND');
    }
    return command;
  }
}
