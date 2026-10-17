import { SymbolView } from 'expo-symbols';
import type { ComponentProps } from 'react';
import { StyleSheet, View } from 'react-native';

import { Sparkline } from '@/components/sparkline';
import { StatusBadge } from '@/components/status-badge';
import { ThemedText } from '@/components/themed-text';
import { Radius, Spacing } from '@/constants/theme';
import { statusTones } from '@/constants/tones';
import type { LabParameter, LabStatus } from '@/data/placeholders';
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

/** One measured parameter: name, status, reading, its trend line and its range. */
export function MetricCard({ parameter }: { parameter: LabParameter }) {
  const theme = useTheme();
  const tone = statusTones[parameter.status];

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
          <Sparkline points={parameter.trendPoints} color={theme[tone.accent]} />
          <View style={[styles.warning, { borderColor: theme[tone.onContainer] }]}>
            <SymbolView name={warningIcon} size={18} tintColor={theme[tone.onContainer]} />
          </View>
        </View>
      </View>

      <ThemedText type="meta" themeColor={tone.onContainer} style={styles.range}>
        {`Range ${parameter.referenceRange} · ${parameter.trend}`}
      </ThemedText>
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
});
