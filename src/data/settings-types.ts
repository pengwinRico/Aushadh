/**
 * The stored settings — the theme, and where the AI is.
 *
 * Like `profile-types.ts`, it lives on its own so the device store and the browser store
 * agree on one shape, and so screens can name the type without importing a platform file.
 */
import type { ThemeName } from '@/constants/theme';

export type Settings = {
  /** `light` until the user picks otherwise; the design is a light surface. */
  theme: ThemeName;
  /** The endpoint typed in Settings, or empty to use the one the app was built with. */
  aiBaseUrl: string;
  /** The model typed in Settings, or empty to use the one the app was built with. */
  aiModel: string;
  /** The key typed in Settings, or empty to use the one the app was built with. */
  aiKey: string;
};

export const DEFAULT_SETTINGS: Settings = {
  theme: 'light',
  aiBaseUrl: '',
  aiModel: '',
  aiKey: '',
};

/** The rows the store keeps, shared by `database.ts` and `database.web.ts`. */
export const SETTING_KEYS = {
  theme: 'theme',
  aiBaseUrl: 'ai-base-url',
  aiModel: 'ai-model',
  aiKey: 'ai-api-key',
} as const;
