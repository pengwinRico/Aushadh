import { Text, type TextProps } from 'react-native';

import { Type, type ThemeColor } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export type ThemedTextProps = TextProps & {
  /** Named text style from the theme — screens never set `fontSize` directly. */
  type?: keyof typeof Type;
  themeColor?: ThemeColor;
};

export function ThemedText({ style, type = 'body', themeColor, ...rest }: ThemedTextProps) {
  const theme = useTheme();

  return <Text style={[{ color: theme[themeColor ?? 'text'] }, Type[type], style]} {...rest} />;
}
