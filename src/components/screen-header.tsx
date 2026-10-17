import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';

/**
 * The oversized screen title and its one-line summary, as drawn in the design.
 * The navigation header stays hidden; this is the screen's own heading.
 */
export function ScreenHeader({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <View style={styles.container}>
      <ThemedText type="display">{title}</ThemedText>
      <ThemedText type="subtitle" themeColor="textSecondary">
        {subtitle}
      </ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: Spacing.half,
  },
});
