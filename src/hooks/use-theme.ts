import { Colors } from '@/constants/theme';
import { useSettings } from '@/context/settings';

/**
 * The palette for the theme chosen in Settings. Screens and components read colours from
 * here, never from `Colors` directly, so switching the theme repaints all of them.
 */
export function useTheme() {
  const { theme } = useSettings();

  return Colors[theme];
}
