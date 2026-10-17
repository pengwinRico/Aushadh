import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';

type ScreenHeaderProps = {
  title: string;
  subtitle: string;
  /** A trailing control on the title line — Settings, on every tab. */
  action?: ReactNode;
};

/**
 * The oversized screen title and its one-line summary, as drawn in the design.
 * The navigation header stays hidden; this is the screen's own heading.
 */
export function ScreenHeader({ title, subtitle, action }: ScreenHeaderProps) {
  return (
    <View style={styles.container}>
      <View style={styles.words}>
        <ThemedText type="display">{title}</ThemedText>
        <ThemedText type="subtitle" themeColor="textSecondary">
          {subtitle}
        </ThemedText>
      </View>
      {action}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: Spacing.three,
  },
  words: {
    flex: 1,
    gap: Spacing.half,
  },
});
