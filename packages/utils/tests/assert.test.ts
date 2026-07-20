import { describe, expect, it } from 'vitest';
import { assert, AssertionError } from '../src/assert.js';

describe('assert', () => {
  it('does not throw when the condition is truthy', () => {
    expect(() => assert(true, 'unreachable')).not.toThrow();
  });

  it('throws AssertionError with the given message when falsy', () => {
    expect(() => assert(false, 'invariant violated')).toThrow(AssertionError);
    expect(() => assert(false, 'invariant violated')).toThrow('invariant violated');
  });

  it('narrows the type of the condition for TypeScript callers', () => {
    const value: string | null = 'ok';
    assert(value !== null, 'value must not be null');
    // If this compiles, `value` is narrowed to `string` after the assertion.
    expect(value.length).toBe(2);
  });
});
