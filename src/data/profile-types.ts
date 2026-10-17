/**
 * The stored profile.
 *
 * It lives on its own so `database.ts` (device) and `database.web.ts` (browser) can agree
 * on one shape, and so screens can name the type without importing a platform file.
 */
export type Profile = {
  /** The name captured on first run. */
  name: string;
};
