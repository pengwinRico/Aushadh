import {
  createContext,
  use,
  useCallback,
  useEffect,
  useMemo,
  useState,
  type PropsWithChildren,
} from 'react';
import { Appearance } from 'react-native';

import type { ThemeName } from '@/constants/theme';
import { normaliseBaseUrl } from '@/data/ai';
import { readSettings, writeSettings } from '@/data/database';
import { DEFAULT_SETTINGS, type Settings } from '@/data/settings-types';

/** The three values that together say where the AI is. Empty means "what the app was built with". */
export type AiSettings = {
  baseUrl: string;
  model: string;
  apiKey: string;
};

type SettingsContextValue = Settings & {
  /** False until the stored settings have been read; the splash waits on it. */
  isReady: boolean;
  /** Switch the theme. The screen changes at once; the store follows. */
  setTheme: (theme: ThemeName) => Promise<void>;
  /** Keep the endpoint, the model and the key the user typed. Throws when the store cannot write. */
  saveAi: (config: AiSettings) => Promise<void>;
};

const SettingsContext = createContext<SettingsContextValue | null>(null);

/** Read and change the settings from anywhere under `<SettingsProvider>`. */
export function useSettings() {
  const value = use(SettingsContext);

  if (!value) throw new Error('useSettings must be used inside a <SettingsProvider>');

  return value;
}

/**
 * The theme and where the AI is, for the whole app.
 *
 * The theme lives here rather than in the OS scheme because the app offers its own switch:
 * `useTheme()` reads it, so every screen and component follows without knowing where the
 * choice came from. The endpoint, the model and the key are kept beside it, so a build that
 * shipped without an AI — or with one the user would rather not use — can still be pointed
 * at a model from the app itself.
 */
export function SettingsProvider({ children }: PropsWithChildren) {
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    // A read that lands after unmount must not set state.
    let active = true;

    readSettings()
      .then((stored) => {
        applyNativeScheme(stored.theme);

        if (active) setSettings(stored);
      })
      .catch((error: unknown) => {
        // Start on the defaults rather than on a screen that never arrives.
        console.warn('Could not read the settings', error);
      })
      .finally(() => {
        if (active) setIsReady(true);
      });

    return () => {
      active = false;
    };
  }, []);

  const setTheme = useCallback(async (theme: ThemeName) => {
    applyNativeScheme(theme);
    setSettings((current) => ({ ...current, theme }));

    try {
      await writeSettings({ theme });
    } catch (error) {
      // The screen is already in the new theme; only the next launch would differ.
      console.warn('Could not store the theme', error);
    }
  }, []);

  const saveAi = useCallback(async (config: AiSettings) => {
    const next = {
      // Stored the way the call will use them, so the field and the request agree.
      aiBaseUrl: normaliseBaseUrl(config.baseUrl),
      aiModel: config.model.trim(),
      aiKey: config.apiKey.trim(),
    };

    await writeSettings(next);
    setSettings((current) => ({ ...current, ...next }));
  }, []);

  const value = useMemo(
    () => ({ ...settings, isReady, setTheme, saveAi }),
    [settings, isReady, setTheme, saveAi],
  );

  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>;
}

/**
 * Tell native chrome — the keyboard, pickers, alerts — to follow the app's theme.
 * `react-native-web` has no such override; there the palette is the whole story.
 */
function applyNativeScheme(theme: ThemeName) {
  if (typeof Appearance.setColorScheme === 'function') {
    Appearance.setColorScheme(theme);
  }
}
