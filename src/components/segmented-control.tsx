import { SymbolView } from 'expo-symbols';
import type { ComponentProps } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

type SymbolName = ComponentProps<typeof SymbolView>['name'];

export type Segment<T extends string> = {
  value: T;
  label: string;
  icon: SymbolName;
};

type SegmentedControlProps<T extends string> = {
  options: readonly Segment<T>[];
  value: T;
  onChange: (value: T) => void;
  /** Read by screen readers on each option, e.g. "Theme". */
  label: string;
};

/**
 * A capsule of choices where exactly one is on — the theme switch in Settings. The selected
 * segment takes the primary fill and its icon turns to the on-primary ink, so the choice
 * reads in both themes.
 */
export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
  label,
}: SegmentedControlProps<T>) {
  const theme = useTheme();

  return (
    <View style={[styles.track, { backgroundColor: theme.surfaceElevated }]}>
      {options.map((option) => {
        const selected = option.value === value;

        return (
          <Pressable
            key={option.value}
            accessibilityRole="radio"
            accessibilityLabel={`${label}: ${option.label}`}
            aria-checked={selected}
            onPress={() => onChange(option.value)}
            style={({ pressed }) => [
              styles.segment,
              selected && { backgroundColor: theme.primary },
              pressed && styles.pressed,
            ]}>
            <SymbolView
              name={option.icon}
              size={18}
              tintColor={selected ? theme.onPrimary : theme.textSecondary}
            />
            <ThemedText
              type="buttonCompact"
              themeColor={selected ? 'onPrimary' : 'textSecondary'}>
              {option.label}
            </ThemedText>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one,
    height: 56,
    padding: Spacing.one,
    borderRadius: Radius.full,
  },
  segment: {
    flex: 1,
    height: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.two,
    borderRadius: Radius.full,
  },
  pressed: {
    opacity: 0.85,
  },
});
