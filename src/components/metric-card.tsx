import { SymbolView } from 'expo-symbols';
import type { ComponentProps } from 'react';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { Sparkline } from '@/components/sparkline';
import { StatusBadge } from '@/components/status-badge';
import { ThemedText } from '@/components/themed-text';
import { Radius, Spacing } from '@/constants/theme';
import { statusTones } from '@/constants/tones';
import type { LabParameter, LabStatus } from '@/data/reports';
import { useTheme } from '@/hooks/use-theme';

type SymbolName = ComponentProps<typeof SymbolView>['name'];

const statusLabels: Record<LabStatus, string> = {
  low: 'Low',
  normal: 'Normal',
  high: 'High',
};

const warningIcon: SymbolName = {
  ios: 'exclamationmark',
  android: 'priority_high',
  web: 'priority_high',
};

/**
 * One measured parameter: the name, its status, the reading, the trend line it has against
 * the readings before it, and the range it is measured against.
 *
 * The circle on the right is the way into what the reading *means* — a sentence on what the
 * test measures and how it connects to the body, written by the model that read the report
 * and kept with the result. It sits behind the circle rather than under every card so the
 * screen stays a list of results to scan; the card opens for the one being wondered about.
 */
export function MetricCard({ parameter }: { parameter: LabParameter }) {
  const theme = useTheme();
  const tone = statusTones[parameter.status];
  const [open, setOpen] = useState(false);

  // The range and the trend are both optional — a report may print no range, and a first
  // reading has nothing before it — so the line is whatever of the two there is.
  const facts = [
    parameter.referenceRange ? `Range ${parameter.referenceRange}` : '',
    parameter.trend,
  ]
    .filter(Boolean)
    .join(' · ');

  return (
    <View style={[styles.card, { backgroundColor: theme[tone.container] }]}>
      <View style={styles.header}>
        <ThemedText type="title" themeColor={tone.onContainer}>
          {parameter.name}
        </ThemedText>
        <StatusBadge label={statusLabels[parameter.status]} color={theme[tone.accent]} />
      </View>

      <View style={styles.reading}>
        <View style={styles.value}>
          <ThemedText type="metric" themeColor={tone.onContainer} style={styles.number}>
            {parameter.value}
          </ThemedText>
          <ThemedText type="unit" themeColor={tone.onContainer}>
            {parameter.unit}
          </ThemedText>
        </View>

        <View style={styles.trend}>
          {parameter.trendPoints.length ? (
            <Sparkline points={parameter.trendPoints} color={theme[tone.accent]} />
          ) : null}
          {parameter.insight ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={
                open ? `Hide what ${parameter.name} means` : `What ${parameter.name} means`
              }
              accessibilityState={{ expanded: open }}
              hitSlop={8}
              onPress={() => setOpen((current) => !current)}
              style={({ pressed }) => [
                styles.warning,
                { borderColor: theme[tone.onContainer] },
                pressed && styles.pressed,
              ]}>
              <SymbolView name={warningIcon} size={18} tintColor={theme[tone.onContainer]} />
            </Pressable>
          ) : null}
        </View>
      </View>

      {facts ? (
        <ThemedText type="meta" themeColor={tone.onContainer} style={styles.range}>
          {facts}
        </ThemedText>
      ) : null}

      {open ? (
        <ThemedText type="body" themeColor={tone.onContainer} style={styles.insight}>
          {parameter.insight}
        </ThemedText>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: Radius.xl,
    borderCurve: 'continuous',
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.three,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.two,
  },
  reading: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.two,
    marginTop: Spacing.one,
  },
  value: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: Spacing.half,
  },
  number: {
    /** Tabular figures keep the reading the same width as the value changes. */
    fontVariant: ['tabular-nums'],
  },
  trend: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  warning: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  range: {
    marginTop: Spacing.one,
  },
  insight: {
    marginTop: Spacing.two,
  },
  pressed: {
    opacity: 0.85,
  },
});
