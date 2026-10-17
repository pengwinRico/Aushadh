import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { PropsWithChildren } from 'react';
import { ScrollView, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { MaxContentWidth, ScreenPadding, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

/**
 * Standard scrollable screen body: the design canvas, screen-edge padding and a max
 * content width so wide screens stay readable. Children stack with one rhythm step
 * between them; screens fine-tune individual gaps with margins.
 *
 * A screen with something pinned below it — the add-medicine sheet's action — passes
 * `style` to take the space that is left.
 */
export function Screen({ children, style }: PropsWithChildren<{ style?: StyleProp<ViewStyle> }>) {
  const insets = useSafeAreaInsets();
  const theme = useTheme();

  return (
    <ScrollView
      style={[{ backgroundColor: theme.background }, style]}
      contentContainerStyle={[styles.content, { paddingTop: insets.top + Spacing.three }]}
      showsVerticalScrollIndicator={false}>
      <View style={styles.inner}>{children}</View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingHorizontal: ScreenPadding,
    paddingBottom: Spacing.five,
    alignItems: 'center',
  },
  inner: {
    width: '100%',
    maxWidth: MaxContentWidth,
    gap: Spacing.three,
  },
});
