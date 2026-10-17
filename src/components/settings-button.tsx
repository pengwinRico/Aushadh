import { router } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { Pressable, StyleSheet } from 'react-native';

import { Radius } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

const gearIcon = { ios: 'gearshape', android: 'settings', web: 'settings' } as const;

/**
 * The way into Settings from every tab. It sits on the title line rather than in a
 * navigation header, because the screens draw their own headings.
 */
export function SettingsButton() {
  const theme = useTheme();

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Settings"
      hitSlop={8}
      onPress={() => router.push('/settings')}
      style={({ pressed }) => [
        styles.button,
        { backgroundColor: theme.surface },
        pressed && styles.pressed,
      ]}>
      <SymbolView name={gearIcon} size={20} tintColor={theme.textSecondary} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    width: 44,
    height: 44,
    borderRadius: Radius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressed: {
    opacity: 0.7,
  },
});
