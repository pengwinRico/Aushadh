import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Radius, Spacing } from '@/constants/theme';
import type { Medicine } from '@/data/placeholders';
import { useTheme } from '@/hooks/use-theme';

/** Nested rows are lighter than the card, so they carry their own tighter inset. */
const ROW_PADDING = 12;

/** One medicine nested inside a category card. */
export function MedicineRow({ medicine }: { medicine: Medicine }) {
  const theme = useTheme();

  return (
    <View style={[styles.row, { backgroundColor: theme.row }]}>
      <ThemedText type="rowTitle">{`${medicine.name} ${medicine.dose}`}</ThemedText>
      <ThemedText type="rowSub" themeColor="textSecondary">
        {medicine.purpose}
      </ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    borderRadius: Radius.lg,
    borderCurve: 'continuous',
    paddingHorizontal: Spacing.three,
    paddingVertical: ROW_PADDING,
    gap: Spacing.half,
  },
});
