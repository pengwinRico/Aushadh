import type { PropsWithChildren } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

type SummaryCardProps = PropsWithChildren<{
  title: string;
  style?: StyleProp<ViewStyle>;
}>;

/**
 * The mint advice card: a heading, the generated summary and the refresh action.
 * The design only ever uses it on the advice screen, so the tone is baked in.
 */
export function SummaryCard({ title, children, style }: SummaryCardProps) {
  const theme = useTheme();

  return (
    <View
      style={[styles.card, { backgroundColor: theme.primaryContainer }, style]}>
      <ThemedText type="title" themeColor="onPrimaryContainer">
        {title}
      </ThemedText>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: Radius.xl,
    borderCurve: 'continuous',
    padding: Spacing.four,
    gap: Spacing.two,
  },
});
