/**
 * Design tokens — the single source of truth for colour, radius, spacing and type.
 *
 * The values are sampled from the product design in `design/*.png` (canvas #F4FBF9,
 * primary #006A62, mint accent #9EF2E7, ink #161D1C, tab bar surface #E3EAE8, …).
 * The design defines a light surface only, so both scheme entries resolve to the same
 * palette and the app pins `userInterfaceStyle: "light"` in **app.json**.
 *
 * Screens and components import tokens — never raw hex values, sizes or radii.
 */

import '@/global.css';

import { Platform, type TextStyle } from 'react-native';

const palette = {
  /** Screen canvas. */
  background: '#F4FBF9',
  /** Grouping surface: the tab bar, chat bubbles. */
  surface: '#E3EAE8',
  /** Slightly lifted surface: text fields. */
  surfaceElevated: '#E9F0EE',
  /** Ink — titles and body copy. */
  text: '#161D1C',
  /** Subtitles, inactive tab labels and icons. */
  textSecondary: '#3F4947',
  /** Field placeholders and other de-emphasised copy. */
  textMuted: '#5F6B68',
  /** Primary action: filled buttons, selected states. */
  primary: '#006A62',
  onPrimary: '#FFFFFF',
  /** Mint accent: the active tab indicator, highlight cards, seals. */
  primaryContainer: '#9EF2E7',
  onPrimaryContainer: '#00201D',
  /** Below-range results: pink card, red badge. */
  error: '#BA1A1A',
  errorContainer: '#FFDAD6',
  onErrorContainer: '#410002',
  /** Above-range results: amber card, gold badge. */
  warning: '#7A5900',
  warningContainer: '#FFDEA6',
  onWarningContainer: '#271900',
  /** Calm grouping — the mint medicine category. */
  secondaryContainer: '#CDE8E3',
  onSecondaryContainer: '#00201D',
  /** Rose grouping — the blood pressure medicine category. */
  tertiary: '#8E4959',
  tertiaryContainer: '#FFD9E2',
  onTertiaryContainer: '#3E001D',
  /** Nested rows inside a category card. */
  row: '#FFF7E9',
} as const;

export const Colors = { light: palette, dark: palette } as const;

export type ThemeColor = keyof typeof palette;

export const Fonts = Platform.select({
  ios: {
    /** iOS `UIFontDescriptorSystemDesignDefault` */
    sans: 'system-ui',
    /** iOS `UIFontDescriptorSystemDesignSerif` */
    serif: 'ui-serif',
    /** iOS `UIFontDescriptorSystemDesignRounded` */
    rounded: 'ui-rounded',
    /** iOS `UIFontDescriptorSystemDesignMonospaced` */
    mono: 'ui-monospace',
  },
  default: {
    sans: 'normal',
    serif: 'serif',
    rounded: 'normal',
    mono: 'monospace',
  },
  web: {
    sans: 'var(--font-display)',
    serif: 'var(--font-serif)',
    rounded: 'var(--font-rounded)',
    mono: 'var(--font-mono)',
  },
});

export const Spacing = {
  half: 2,
  one: 4,
  two: 8,
  three: 16,
  four: 24,
  five: 32,
  six: 64,
} as const;

/** Screen-edge inset for content and the tab bar (design: ≈27.3pt). */
export const ScreenPadding = 28;

export const Radius = {
  /** Small chips and inline pills. */
  sm: 8,
  /** Inline tags and compact surfaces. */
  md: 12,
  /** Nested rows and chat bubbles. */
  lg: 24,
  /** Cards, panels and the tab bar. */
  xl: 32,
  /** Capsules: buttons, badges, the tab indicator. */
  full: 9999,
} as const;

/**
 * Named text styles. Screens pick a variant through `ThemedText` and never set
 * `fontSize` directly. Colours live in `Colors` — select them with `themeColor`.
 */
export const Type = {
  /** Screen titles: "Reports", "Cabinet", "Advice". */
  display: { fontSize: 40, lineHeight: 44, fontWeight: 700, letterSpacing: -1 },
  /** Card titles: "Hemoglobin", "Your health summary". */
  title: { fontSize: 17, lineHeight: 22, fontWeight: 700 },
  /** Category headers in the cabinet. */
  section: { fontSize: 20, lineHeight: 26, fontWeight: 700 },
  /** The headline number on a parameter card. */
  metric: { fontSize: 40, lineHeight: 44, fontWeight: 700 },
  /** The unit set beside a metric. */
  unit: { fontSize: 20, lineHeight: 24, fontWeight: 600 },
  /** The line under a screen title. */
  subtitle: { fontSize: 15, lineHeight: 20, fontWeight: 400 },
  /** Running copy: summary paragraphs and chat messages. */
  body: { fontSize: 14, lineHeight: 22, fontWeight: 400 },
  /** Reference ranges and other one-line detail. */
  meta: { fontSize: 12, lineHeight: 16, fontWeight: 500 },
  /** Disclaimers and fine print. */
  note: { fontSize: 12, lineHeight: 16, fontWeight: 400 },
  /** Status pills. */
  badge: { fontSize: 12, lineHeight: 16, fontWeight: 700 },
  /** Labels inside filled buttons. */
  button: { fontSize: 16, lineHeight: 20, fontWeight: 700 },
  /** Labels in compact buttons such as "Refresh summary". */
  buttonCompact: { fontSize: 13, lineHeight: 18, fontWeight: 700 },
  /** Medicine names inside a category card. */
  rowTitle: { fontSize: 15, lineHeight: 20, fontWeight: 600 },
  /** The plain-language description under a medicine name. */
  rowSub: { fontSize: 11, lineHeight: 16, fontWeight: 400 },
  /** Counts inside a seal. */
  seal: { fontSize: 15, lineHeight: 15, fontWeight: 700 },
  /** Tab labels and other compact chrome. */
  label: { fontSize: 11, lineHeight: 14, fontWeight: 500 },
  /** The selected tab label. */
  labelStrong: { fontSize: 11, lineHeight: 14, fontWeight: 700 },
} as const satisfies Record<string, TextStyle>;

export const MaxContentWidth = 800;
