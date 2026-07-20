/**
 * Base error for programming-error assertions thrown by {@link assert}.
 * Distinct from `@praxo/core`'s `PraxoError`, which represents recoverable
 * runtime/editor-domain errors.
 */
export class AssertionError extends Error {
  public override readonly name = 'AssertionError';
}

/**
 * Throws {@link AssertionError} when `condition` is falsy.
 *
 * Intended for invariants that indicate a bug in the calling code (e.g. a
 * plugin registering a command twice), not for validating external input.
 */
export function assert(condition: unknown, message: string): asserts condition {
  if (!condition) {
    throw new AssertionError(message);
  }
}
