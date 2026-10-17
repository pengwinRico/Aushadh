/**
 * Identifiers for records the user creates.
 *
 * A record keeps the id it was created with, so it is minted once — before the store sees
 * it — rather than by the store: the device and the browser then write the same value,
 * and nothing has to be renumbered when a record is read back.
 *
 * The timestamp makes collisions vanishingly unlikely for one person's cabinet, which is
 * why this stays dependency-free instead of pulling in a UUID module.
 */
export function newRecordId(prefix: string): string {
  const unique = `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 10)}`;

  return `${prefix}_${unique}`;
}
