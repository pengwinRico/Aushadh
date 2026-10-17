/**
 * Design tokens — the single source of truth for colour, radius, spacing and type.
 *
 * The light values are sampled from the product design in `design/*.png` (canvas
 * #F4FBF9, primary #006A62, mint accent #9EF2E7, ink #161D1C, tab bar surface #E3EAE8,
 * …). The design only draws a light surface, so the dark values are a derivation of it:
 * the same roles, tonally inverted, with the mint kept as the accent and the amber and
 * rose groups carried into their dark containers.
 *
 * Both schemes name the same roles, which is what lets a screen switch with the setting
 * in `useSettings()` and never branch on the scheme itself.
 *
 * Screens and components import tokens — never raw hex values, sizes or radii.
 */

import '@/global.css';

import { Platform, type TextStyle } from 'react-native';

export type ThemeName = 'light' | 'dark';

const light = {
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
  /** Text and glyphs on a solid accent fill — badges and count seals. */
  onAccent: '#FFFFFF',
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

export type ThemeColor = keyof typeof light;

/** The same roles on a dark canvas. Accents lighten so badges and seals keep their fill. */
const dark: Record<ThemeColor, string> = {
  background: '#0C1312',
  surface: '#18211F',
  surfaceElevated: '#202B29',
  text: '#E4EBE8',
  textSecondary: '#B3C2BE',
  textMuted: '#8C9B97',
  primary: '#7FE3D5',
  onPrimary: '#00201D',
  onAccent: '#00201D',
  primaryContainer: '#123B35',
  onPrimaryContainer: '#A9F0E6',
  error: '#FFB4AB',
  errorContainer: '#4A1512',
  onErrorContainer: '#FFDAD6',
  warning: '#FFD18C',
  warningContainer: '#3A2A0C',
  onWarningContainer: '#FFE6C2',
  secondaryContainer: '#12332F',
  onSecondaryContainer: '#C7EDE7',
  tertiary: '#FFB1C1',
  tertiaryContainer: '#3F1A24',
  onTertiaryContainer: '#FFD9E2',
  row: '#0E1A18',
};

export const Colors = { light, dark } satisfies Record<ThemeName, Record<ThemeColor, string>>;

export type Palette = (typeof Colors)[ThemeName];

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
