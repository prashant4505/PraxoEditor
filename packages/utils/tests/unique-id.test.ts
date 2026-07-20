import { describe, expect, it } from 'vitest';
import { uniqueId } from '../src/unique-id.js';

describe('uniqueId', () => {
  it('defaults to an "id" prefix', () => {
    expect(uniqueId()).toMatch(/^id_\d+_[a-z0-9]+$/);
  });

  it('uses the provided prefix', () => {
    expect(uniqueId('cmd')).toMatch(/^cmd_\d+_[a-z0-9]+$/);
  });

  it('never returns the same value twice', () => {
    const ids = new Set(Array.from({ length: 1000 }, () => uniqueId()));
    expect(ids.size).toBe(1000);
  });
});
