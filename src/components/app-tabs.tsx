import { type Href } from 'expo-router';
import {
  TabList,
  type TabListProps,
  TabSlot,
  TabTrigger,
  type TabTriggerSlotProps,
  Tabs,
} from 'expo-router/ui';
import { SymbolView } from 'expo-symbols';
import type { ComponentProps } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { Radius, ScreenPadding, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

type SymbolName = ComponentProps<typeof SymbolView>['name'];

/** The active-tab capsule and the gap down to its label, as drawn. */
const CAPSULE_HEIGHT = 28;
const TAB_GAP = 12;

type TabDefinition = {
  /** Identifies the trigger; must match a route in `src/app/(tabs)`. */
  name: string;
  href: Href;
  label: string;
  icon: SymbolName;
};

/**
 * The three product tabs. Icons are native symbols — SF Symbols on iOS,
 * Material Symbols on Android and web — so nothing extra is bundled.
 */
const tabs = [
  {
    name: 'reports',
    href: '/',
    label: 'Reports',
    icon: { ios: 'list.bullet.rectangle', android: 'article', web: 'article' },
  },
  {
    name: 'cabinet',
    href: '/cabinet',
    label: 'Cabinet',
    icon: { ios: 'pill', android: 'medication', web: 'medication' },
  },
  {
    name: 'advice',
    href: '/advice',
    label: 'Advice',
    icon: { ios: 'message', android: 'chat_bubble', web: 'chat_bubble' },
  },
] as const satisfies readonly TabDefinition[];

/**
 * The tab navigator: headless tabs from `expo-router/ui` with the floating tab bar
 * from the design. One component so the `(tabs)` layout stays declarative.
 */
export default function AppTabs() {
  return (
    <Tabs>
      <TabSlot />
      <TabList asChild>
        <TabBar>
          {tabs.map((tab) => (
            <TabTrigger key={tab.name} name={tab.name} href={tab.href} asChild>
              <TabButton label={tab.label} icon={tab.icon} />
            </TabTrigger>
          ))}
        </TabBar>
      </TabList>
    </Tabs>
  );
}

/**
 * The floating bar: a rounded surface inset from the screen edges, sitting above the
 * home indicator. `TabList asChild` forwards its own layout style, so it is applied
 * first and the design's layout wins.
 */
function TabBar({ children, style, ...rest }: TabListProps) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();

  return (
    <View
      {...rest}
      style={[
        styles.barWrapper,
        { backgroundColor: theme.background, paddingBottom: insets.bottom + Spacing.two },
      ]}>
      <View style={[style, styles.bar, { backgroundColor: theme.surface }]}>{children}</View>
    </View>
  );
}

type TabButtonProps = TabTriggerSlotProps & {
  label: string;
  icon: SymbolName;
};

/**
 * One tab: the label sits under an icon, and the selected tab gets the mint capsule.
 * `TabTrigger asChild` injects the focus state and press handlers.
 */
function TabButton({ label, icon, isFocused, ...rest }: TabButtonProps) {
  const theme = useTheme();

  return (
    <Pressable
      {...rest}
      accessibilityRole="tab"
      accessibilityLabel={label}
      aria-selected={!!isFocused}
      style={({ pressed }) => [styles.tab, pressed && styles.tabPressed]}>
      <View
        style={[
          styles.iconCapsule,
          isFocused && { backgroundColor: theme.primaryContainer },
        ]}>
        <SymbolView
          name={icon}
          size={22}
          tintColor={isFocused ? theme.onPrimaryContainer : theme.textSecondary}
        />
      </View>
      <ThemedText
        type={isFocused ? 'labelStrong' : 'label'}
        themeColor={isFocused ? 'text' : 'textSecondary'}>
        {label}
      </ThemedText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  barWrapper: {
    paddingHorizontal: ScreenPadding,
    paddingTop: Spacing.two,
  },
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 68,
    borderRadius: Radius.xl,
    borderCurve: 'continuous',
    paddingHorizontal: Spacing.one,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: TAB_GAP,
    paddingVertical: Spacing.one,
    borderRadius: Radius.lg,
  },
  tabPressed: {
    opacity: 0.7,
  },
  iconCapsule: {
    width: 60,
    height: CAPSULE_HEIGHT,
    borderRadius: Radius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
