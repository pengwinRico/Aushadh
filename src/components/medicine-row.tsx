import { Image } from 'expo-image';
import { SymbolView } from 'expo-symbols';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { PillButton } from '@/components/pill-button';
import { ThemedText } from '@/components/themed-text';
import { Radius, Spacing } from '@/constants/theme';
import type { Medicine } from '@/data/placeholders';
import { useTheme } from '@/hooks/use-theme';

/** Nested rows are lighter than the card, so they carry their own tighter inset. */
const ROW_PADDING = 12;

/** The pack photo beside the name: large enough to recognise, small enough to stay a row. */
const PHOTO_SIZE = 52;

const removeIcon = { ios: 'trash', android: 'delete', web: 'delete' } as const;

type MedicineRowProps = {
  medicine: Medicine;
  /** Takes the medicine off the shelf. Absent, the row is read-only. */
  onRemove?: (medicineId: string) => void;
};

/**
 * One medicine nested inside a category card: its pack photo when there is one, what it
 * is, and a way to take it back off the shelf.
 *
 * Removing asks first — the row turns into the question — because it also takes the
 * photo and, once the group is empty, the group itself.
 */
export function MedicineRow({ medicine, onRemove }: MedicineRowProps) {
  const theme = useTheme();
  const [confirming, setConfirming] = useState(false);
  const label = [medicine.name, medicine.dose].filter(Boolean).join(' ');

  if (confirming && onRemove) {
    return (
      <View style={[styles.row, { backgroundColor: theme.row }]}>
        <View style={styles.confirm}>
          <ThemedText type="rowTitle">{`Remove ${label}?`}</ThemedText>
          <ThemedText type="rowSub" themeColor="textSecondary">
            {medicine.photo
              ? 'Its pack photo goes too, and the group with it if this was the last one.'
              : 'The group goes with it if this was the last one.'}
          </ThemedText>
          <View style={styles.actions}>
            <PillButton
              size="compact"
              tone="danger"
              label="Remove"
              onPress={() => onRemove(medicine.id)}
            />
            <PillButton
              size="compact"
              tone="quiet"
              label="Keep"
              onPress={() => setConfirming(false)}
            />
          </View>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.row, { backgroundColor: theme.row }]}>
      {medicine.photo ? (
        <Image
          source={{ uri: medicine.photo }}
          style={styles.photo}
          contentFit="cover"
          accessibilityLabel={`Pack photo of ${medicine.name}`}
        />
      ) : null}

      <View style={styles.text}>
        <ThemedText type="rowTitle">{label}</ThemedText>
        {medicine.purpose ? (
          <ThemedText type="rowSub" themeColor="textSecondary">
            {medicine.purpose}
          </ThemedText>
        ) : null}
      </View>

      {onRemove ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Remove ${label}`}
          hitSlop={10}
          onPress={() => setConfirming(true)}
          style={({ pressed }) => [styles.remove, pressed && styles.pressed]}>
          <SymbolView name={removeIcon} size={18} tintColor={theme.textMuted} />
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    borderRadius: Radius.lg,
    borderCurve: 'continuous',
    paddingHorizontal: Spacing.three,
    paddingVertical: ROW_PADDING,
  },
  photo: {
    width: PHOTO_SIZE,
    height: PHOTO_SIZE,
    borderRadius: Radius.md,
    borderCurve: 'continuous',
  },
  text: {
    flex: 1,
    gap: Spacing.half,
  },
  confirm: {
    flex: 1,
    gap: Spacing.two,
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  remove: {
    padding: Spacing.one,
  },
  pressed: {
    opacity: 0.85,
  },
});
