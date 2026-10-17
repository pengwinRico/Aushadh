import {
  createContext,
  use,
  useCallback,
  useEffect,
  useMemo,
  useState,
  type PropsWithChildren,
} from 'react';

import { readProfile, writeProfileName } from '@/data/database';
import type { Profile } from '@/data/profile-types';

type ProfileContextValue = {
  /** `null` until a name has been captured — which is what gates the onboarding. */
  profile: Profile | null;
  /** False until the stored profile has been read; the splash waits on it. */
  isReady: boolean;
  /** Capture the first-run name; the gate opens as soon as it resolves. */
  saveName: (name: string) => Promise<void>;
};

const ProfileContext = createContext<ProfileContextValue | null>(null);

/** Read and write the stored profile from anywhere under `<ProfileProvider>`. */
export function useProfile() {
  const value = use(ProfileContext);

  if (!value) throw new Error('useProfile must be used inside a <ProfileProvider>');

  return value;
}

/**
 * Holds the profile for the whole app: reads it once at start, hands the first-run name
 * to the store. The root navigator turns `profile` into the onboarding gate.
 */
export function ProfileProvider({ children }: PropsWithChildren) {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    // A read that lands after unmount must not set state.
    let active = true;

    readProfile()
      .then((stored) => {
        if (active) setProfile(stored);
      })
      .catch((error: unknown) => {
        // Treat an unreadable store as a first run: the app still opens.
        console.warn('Could not read the profile', error);
      })
      .finally(() => {
        if (active) setIsReady(true);
      });

    return () => {
      active = false;
    };
  }, []);

  const saveName = useCallback(async (name: string) => {
    const trimmed = name.trim();

    if (!trimmed) return;

    await writeProfileName(trimmed);
    setProfile({ name: trimmed });
  }, []);

  const value = useMemo(() => ({ profile, isReady, saveName }), [profile, isReady, saveName]);

  return <ProfileContext.Provider value={value}>{children}</ProfileContext.Provider>;
}
