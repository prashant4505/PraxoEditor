/**
 * Stable machine-readable codes for {@link PraxoError}. Consumers (host
 * applications, plugins) can safely `switch` on `error.code` without
 * parsing message strings, which may change wording across versions.
 */
export type PraxoErrorCode =
  | 'ELEMENT_NOT_FOUND'
  | 'ALREADY_DESTROYED'
  | 'COMMAND_NOT_FOUND'
  | 'COMMAND_ALREADY_REGISTERED'
  | 'COMMAND_DISABLED'
  | 'PLUGIN_ALREADY_INSTALLED'
  | 'PLUGIN_NOT_FOUND'
  | 'PLUGIN_DEPENDENCY_MISSING'
  | 'PLUGIN_HAS_DEPENDENTS';

/**
 * Error type raised for all recoverable, editor-domain failures (missing
 * commands, duplicate plugins, using a destroyed instance, ...).
 *
 * Distinct from `@praxo/utils`'s `AssertionError`, which signals a bug in
 * Praxo's own internals rather than a misuse of the public API.
 */
export class PraxoError extends Error {
  public override readonly name = 'PraxoError';

  public constructor(
    message: string,
    public readonly code: PraxoErrorCode,
  ) {
    super(message);
  }
}
