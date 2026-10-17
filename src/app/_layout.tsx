import { DarkTheme, DefaultTheme, ThemeProvider } from 'expo-router';
import { Stack } from 'expo-router/stack';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useMemo } from 'react';

import { AnimatedSplashOverlay } from '@/components/animated-icon';
import { CabinetProvider } from '@/context/cabinet';
import { ProfileProvider, useProfile } from '@/context/profile';
import { ReportsProvider } from '@/context/reports';
import { SettingsProvider, useSettings } from '@/context/settings';
import { useTheme } from '@/hooks/use-theme';

SplashScreen.preventAutoHideAsync();

/**
 * Root navigator. Navigation chrome, the status bar and the splash follow the theme chosen
 * in Settings, which also holds the AI key every screen calls the model with.
 *
 * The first run has a name to capture, so `welcome` is the only reachable screen until
 * the profile store holds one; after that the guard swaps to the tabs. Expo Router falls
 * back to the first available screen when a guard closes, which is the job `redirectTo`
 * does from SDK 58 on.
 */
export default function RootLayout() {
  return (
    <SettingsProvider>
      <Navigation />
    </SettingsProvider>
  );
}

/** The navigator's own theme: `dark` swaps the chrome, the palette comes from the tokens. */
function Navigation() {
  const { theme } = useSettings();
  const colors = useTheme();
  const base = theme === 'dark' ? DarkTheme : DefaultTheme;

  const navigationTheme = useMemo(
    () => ({
      ...base,
      colors: {
        ...base.colors,
        background: colors.background,
        card: colors.background,
        text: colors.text,
        border: colors.surface,
        primary: colors.primary,
      },
    }),
    [base, colors],
  );

  return (
    <ThemeProvider value={navigationTheme}>
      <ProfileProvider>
        <CabinetProvider>
          <ReportsProvider>
            <RootNavigator />
          </ReportsProvider>
        </CabinetProvider>
      </ProfileProvider>
    </ThemeProvider>
  );
}

function RootNavigator() {
  const { profile, isReady } = useProfile();
  const { isReady: settingsReady, theme } = useSettings();
  const colors = useTheme();

  // The guards have to see the real profile on the navigator's first render: mounting it
  // before the read lands would resolve a deep link against the "no profile" state and
  // bounce the user into onboarding. Holding the splash instead is the documented
  // pattern — https://docs.expo.dev/versions/v56.0.0/sdk/splash-screen
  // The theme is read from the same store, so waiting on it also keeps a dark launch from
  // flashing the light splash.
  if (!isReady || !settingsReady) return null;

  return (
    <>
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: colors.background },
        }}>
        <Stack.Protected guard={profile !== null}>
          <Stack.Screen name="(tabs)" />
          <Stack.Screen name="add-medicine" options={{ presentation: 'modal' }} />
          <Stack.Screen name="scan-report" options={{ presentation: 'modal' }} />
          <Stack.Screen name="settings" options={{ presentation: 'modal' }} />
        </Stack.Protected>

        <Stack.Protected guard={profile === null}>
          <Stack.Screen name="welcome" />
        </Stack.Protected>
      </Stack>
      <StatusBar style={theme === 'dark' ? 'light' : 'dark'} />
      <AnimatedSplashOverlay />
    </>
  );
}
