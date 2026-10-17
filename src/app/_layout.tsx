import { DefaultTheme, ThemeProvider } from 'expo-router';
import { Stack } from 'expo-router/stack';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';

import { AnimatedSplashOverlay } from '@/components/animated-icon';
import { Colors } from '@/constants/theme';

SplashScreen.preventAutoHideAsync();

/**
 * Root navigator. The design is a single light surface, so navigation chrome stays on
 * `DefaultTheme` and the status bar uses dark content, matching app.json.
 */
export default function RootLayout() {
  return (
    <ThemeProvider value={DefaultTheme}>
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: Colors.light.background },
        }}
      />
      <StatusBar style="dark" />
      <AnimatedSplashOverlay />
    </ThemeProvider>
  );
}
