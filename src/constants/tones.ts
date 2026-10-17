import type { ThemeColor } from '@/constants/theme';
import type { CategoryTone, LabStatus } from '@/data/placeholders';

/**
 * The palette a result status or a medicine category draws in.
 *
 * Both maps name theme roles rather than hex values, and they live together — apart from
 * the components that use them — so the card that draws a group and the chip that picks
 * one can never drift apart.
 */

/** A result: the card fill, the badge and the trend line. */
export const statusTones = {
  low: { container: 'errorContainer', onContainer: 'onErrorContainer', accent: 'error' },
  normal: { container: 'primaryContainer', onContainer: 'onPrimaryContainer', accent: 'primary' },
  high: { container: 'warningContainer', onContainer: 'onWarningContainer', accent: 'warning' },
} as const satisfies Record<
  LabStatus,
  { container: ThemeColor; onContainer: ThemeColor; accent: ThemeColor }
>;

/** A medicine group: the card fill, its ink and the count seal. */
export const categoryTones = {
  warning: { container: 'warningContainer', onContainer: 'onWarningContainer', accent: 'warning' },
  secondary: {
    container: 'secondaryContainer',
    onContainer: 'onSecondaryContainer',
    accent: 'primary',
  },
  tertiary: {
    container: 'tertiaryContainer',
    onContainer: 'onTertiaryContainer',
    accent: 'tertiary',
  },
} as const satisfies Record<
  CategoryTone,
  { container: ThemeColor; onContainer: ThemeColor; accent: ThemeColor }
>;
