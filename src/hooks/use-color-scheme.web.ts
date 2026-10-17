import { useSyncExternalStore } from 'react';
import { useColorScheme as useRNColorScheme } from 'react-native';

const subscribe = () => () => {};

/**
 * Static rendering has no system scheme to read, so the server snapshot is `light`
 * and `useSyncExternalStore` swaps in the real value after hydration — no effect and
 * no cascading render.
 */
export function useColorScheme() {
  const colorScheme = useRNColorScheme();

  return useSyncExternalStore(
    subscribe,
    () => colorScheme ?? 'light',
    () => 'light',
  );
}
