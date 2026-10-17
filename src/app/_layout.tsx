import { DefaultTheme, ThemeProvider } from 'expo-router';
import { Stack } from 'expo-router/stack';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';

import { AnimatedSplashOverlay } from '@/components/animated-icon';
import { Colors } from '@/constants/theme';
import { CabinetProvider } from '@/context/cabinet';
import { ProfileProvider, useProfile } from '@/context/profile';

SplashScreen.preventAutoHideAsync();

/**
 * Root navigator. The design is a single light surface, so navigation chrome stays on
 * `DefaultTheme` and the status bar uses dark content, matching app.json.
 *
 * The first run has a name to capture, so `welcome` is the only reachable screen until
 * the profile store holds one; after that the guard swaps to the tabs. Expo Router falls
 * back to the first available screen when a guard closes, which is the job `redirectTo`
 * does from SDK 58 on.
 */
export default function RootLayout() {
  return (
    <ThemeProvider value={DefaultTheme}>
      <ProfileProvider>
        <CabinetProvider>
          <RootNavigator />
        </CabinetProvider>
      </ProfileProvider>
    </ThemeProvider>
  );
}

function RootNavigator() {
  const { profile, isReady } = useProfile();

  // The guards have to see the real profile on the navigator's first render: mounting it
  // before the read lands would resolve a deep link against the "no profile" state and
  // bounce the user into onboarding. Holding the splash instead is the documented
  // pattern — https://docs.expo.dev/versions/v56.0.0/sdk/splash-screen
  if (!isReady) return null;

  return (
    <>
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: Colors.light.background },
        }}>
        <Stack.Protected guard={profile !== null}>
          <Stack.Screen name="(tabs)" />
          <Stack.Screen name="add-medicine" options={{ presentation: 'modal' }} />
        </Stack.Protected>

        <Stack.Protected guard={profile === null}>
          <Stack.Screen name="welcome" />
        </Stack.Protected>
      </Stack>
      <StatusBar style="dark" />
      <AnimatedSplashOverlay />
    </>
  );
}
