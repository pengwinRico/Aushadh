/**
 * The stored settings — the theme and the key the AI is called with.
 *
 * Like `profile-types.ts`, it lives on its own so the device store and the browser store
 * agree on one shape, and so screens can name the type without importing a platform file.
 */
import type { ThemeName } from '@/constants/theme';

export type Settings = {
  /** `light` until the user picks otherwise; the design is a light surface. */
  theme: ThemeName;
  /** The key typed into Settings, or empty to fall back to the one the app was built with. */
  aiKey: string;
};

export const DEFAULT_SETTINGS: Settings = { theme: 'light', aiKey: '' };

/** The rows the store keeps, shared by `database.ts` and `database.web.ts`. */
export const SETTING_KEYS = {
  theme: 'theme',
  aiKey: 'ai-api-key',
} as const;
