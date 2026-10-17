import { SymbolView } from 'expo-symbols';
import type { ComponentProps } from 'react';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { MedicineRow } from '@/components/medicine-row';
import { Seal } from '@/components/seal';
import { ThemedText } from '@/components/themed-text';
import { Radius, Spacing } from '@/constants/theme';
import { categoryTones } from '@/constants/tones';
import type { MedicineCategory } from '@/data/placeholders';
import { useTheme } from '@/hooks/use-theme';

type SymbolName = ComponentProps<typeof SymbolView>['name'];

const expandIcons: Record<'open' | 'closed', SymbolName> = {
  open: { ios: 'chevron.up', android: 'expand_less', web: 'expand_less' },
  closed: { ios: 'chevron.down', android: 'expand_more', web: 'expand_more' },
};

/** The count seal's gap to the category name, and the header's extra inset. */
const HEADER_GAP = 14;
const HEADER_INSET = 6;

type CategoryCardProps = {
  category: MedicineCategory;
  /** Open on first paint. The design shows the first group expanded. */
  initiallyExpanded?: boolean;
  /** Passed to each row's remove action. Absent, the card is read-only. */
  onRemoveMedicine?: (medicineId: string) => void;
};

/** A group of medicines: a header with its count, and the medicines when open. */
export function CategoryCard({
  category,
  initiallyExpanded = false,
  onRemoveMedicine,
}: CategoryCardProps) {
  const theme = useTheme();
  const tone = categoryTones[category.tone];
  const [expanded, setExpanded] = useState(initiallyExpanded);

  return (
    <View style={[styles.card, { backgroundColor: theme[tone.container] }]}>
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ expanded }}
        onPress={() => setExpanded((current) => !current)}
        style={({ pressed }) => [styles.header, pressed && styles.pressed]}>
        <Seal size={44} color={theme[tone.accent]}>
          <ThemedText type="seal" themeColor="onPrimary">
            {category.medicines.length}
          </ThemedText>
        </Seal>
        <ThemedText type="section" themeColor={tone.onContainer} style={styles.name}>
          {category.name}
        </ThemedText>
        <SymbolView
          name={expanded ? expandIcons.open : expandIcons.closed}
          size={18}
          tintColor={theme[tone.onContainer]}
        />
      </Pressable>

      {expanded ? (
        <View style={styles.medicines}>
          {category.medicines.map((medicine) => (
            <MedicineRow
              key={medicine.id}
              medicine={medicine}
              onRemove={onRemoveMedicine}
            />
          ))}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: Radius.xl,
    borderCurve: 'continuous',
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.three,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: HEADER_GAP,
    /** The header sits slightly further in than the nested rows, as in the design. */
    paddingHorizontal: HEADER_INSET,
  },
  pressed: {
    opacity: 0.85,
  },
  name: {
    flex: 1,
  },
  medicines: {
    gap: Spacing.three,
    marginTop: Spacing.three,
  },
});
