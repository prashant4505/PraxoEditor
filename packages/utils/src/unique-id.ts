let counter = 0;

/**
 * Generates a short, collision-resistant, human-readable identifier.
 *
 * Used for keying plugins, commands, and (later) document model nodes.
 * Not cryptographically secure — do not use for anything security-sensitive.
 *
 * @param prefix - Optional prefix to make ids self-describing, e.g. `uniqueId('cmd')` -> `cmd_1_l3k2j9`.
 */
export function uniqueId(prefix = 'id'): string {
  counter += 1;
  const random = Math.random().toString(36).slice(2, 8);
  return `${prefix}_${counter}_${random}`;
}
