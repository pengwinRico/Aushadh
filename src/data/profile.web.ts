import type { Profile } from '@/data/profile-types';

/**
 * Browser stand-in for the on-device database.
 *
 * `expo-sqlite` on web wants a wasm bundle plus cross-origin isolation headers, and the
 * app ships to iOS and Android — the browser build exists to preview screens, so the
 * profile is kept in `localStorage` there. Both modules export the same API, so no screen
 * knows the difference.
 */
const STORAGE_KEY = 'aushadh.profile';

/** The stored profile, or `null` on a first run. */
export async function readProfile(): Promise<Profile | null> {
  try {
    const stored = globalThis.localStorage?.getItem(STORAGE_KEY);

    if (!stored) return null;

    const profile = JSON.parse(stored) as Profile;

    return typeof profile?.name === 'string' ? profile : null;
  } catch {
    // Browsers in private mode reject reads; treat that as a first run.
    return null;
  }
}

/** Store the first name, replacing any earlier one. */
export async function writeProfileName(name: string): Promise<void> {
  try {
    globalThis.localStorage?.setItem(STORAGE_KEY, JSON.stringify({ name }));
  } catch (error) {
    console.warn('Could not store the profile', error);
  }
}
