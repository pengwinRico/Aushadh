import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Radius } from '@/constants/theme';

type StatusBadgeProps = {
  /** "Low", "Normal", "High". */
  label: string;
  /** Badge fill — the accent colour of the card's tone. */
  color: string;
};

/**
 * The fixed-width status pill on a parameter card. Every badge in the design is the
 * same size regardless of how long the label is, so the width is explicit.
 */
export function StatusBadge({ label, color }: StatusBadgeProps) {
  return (
    <View style={[styles.badge, { backgroundColor: color }]}>
      <ThemedText type="badge" themeColor="onAccent">
        {label}
      </ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    width: 72,
    height: 29,
    borderRadius: Radius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
