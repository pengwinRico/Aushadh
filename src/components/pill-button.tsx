import { SymbolView } from 'expo-symbols';
import type { ComponentProps } from 'react';
import { Pressable, StyleSheet, type StyleProp, type ViewStyle } from 'react-native';

import { Seal } from '@/components/seal';
import { ThemedText } from '@/components/themed-text';
import { Radius, Spacing, type ThemeColor } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

type SymbolName = ComponentProps<typeof SymbolView>['name'];

/** The seal's inset and the gap to the label, as drawn. */
const BUTTON_PADDING = 12;
const SEAL_GAP = 14;

type PillButtonTone = 'primary' | 'quiet' | 'danger';

/**
 * The three weights an action can carry. `primary` is the design's filled button; `quiet`
 * is a secondary way out that reads as text on whatever it sits on; `danger` is the
 * fill that says a press will take something away.
 */
const tones = {
  primary: { label: 'onPrimary', container: 'primary' },
  quiet: { label: 'textSecondary', container: null },
  danger: { label: 'onErrorContainer', container: 'errorContainer' },
} as const satisfies Record<PillButtonTone, { label: ThemeColor; container: ThemeColor | null }>;

type PillButtonProps = {
  label: string;
  onPress?: () => void;
  /** Fades the button and blocks the action — used while the first-run name is empty. */
  disabled?: boolean;
  /** `large` is a screen call to action; `compact` is the inline action inside a card. */
  size?: 'large' | 'compact';
  /** `primary` fills; `quiet` and `danger` are the secondary and destructive weights. */
  tone?: PillButtonTone;
  /** Draws the mint seal with this glyph ahead of the label. Primary buttons only. */
  sealIcon?: SymbolName;
  style?: StyleProp<ViewStyle>;
};

/** The filled primary action from the design: "Scan a lab report", "Add medicine", … */
export function PillButton({
  label,
  onPress,
  disabled,
  size = 'large',
  tone = 'primary',
  sealIcon,
  style,
}: PillButtonProps) {
  const theme = useTheme();
  const large = size === 'large';
  const weight = tones[tone];

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: disabled === true }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.base,
        large ? styles.large : styles.compact,
        { backgroundColor: weight.container ? theme[weight.container] : 'transparent' },
        disabled && styles.disabled,
        pressed && styles.pressed,
        style,
      ]}>
      {sealIcon && tone === 'primary' ? (
        <Seal size={44} color={theme.primaryContainer}>
          <SymbolView name={sealIcon} size={20} tintColor={theme.onPrimaryContainer} />
        </Seal>
      ) : null}
      <ThemedText type={large ? 'button' : 'buttonCompact'} themeColor={weight.label}>
        {label}
      </ThemedText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: Radius.full,
  },
  large: {
    height: 62,
    gap: SEAL_GAP,
    paddingHorizontal: BUTTON_PADDING,
  },
  compact: {
    height: 38,
    paddingHorizontal: Spacing.three,
  },
  pressed: {
    opacity: 0.85,
  },
  disabled: {
    opacity: 0.4,
  },
});
