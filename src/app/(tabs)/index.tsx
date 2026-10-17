import { router } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { MetricCard } from '@/components/metric-card';
import { PillButton } from '@/components/pill-button';
import { Screen } from '@/components/screen';
import { ScreenHeader } from '@/components/screen-header';
import { SettingsButton } from '@/components/settings-button';
import { ThemedText } from '@/components/themed-text';
import { Radius, Spacing } from '@/constants/theme';
import { useReports } from '@/context/reports';
import { reportsSubtitle } from '@/data/reports';
import { useTheme } from '@/hooks/use-theme';

const scanIcon = {
  ios: 'doc.text.viewfinder',
  android: 'document_scanner',
  web: 'document_scanner',
} as const;
const emptyIcon = { ios: 'camera', android: 'photo_camera', web: 'photo_camera' } as const;
const trashIcon = { ios: 'trash', android: 'delete', web: 'delete' } as const;

/**
 * The Reports tab: what the last scanned report said.
 *
 * It starts empty and stays empty until a report is scanned — the numbers here are the
 * readings the model took off the paper, not samples — and every scan is kept, so each card
 * can say how this reading sits against the one before it.
 */
export default function ReportsScreen() {
  const { parameters, report, removeLatestReport } = useReports();

  // The store answers within a frame of the tab opening. Nothing is better than numbers
  // that are a frame away from being right.
  if (!parameters) return null;

  return (
    <Screen>
      <ScreenHeader
        title="Reports"
        subtitle={reportsSubtitle(report, parameters.length)}
        action={<SettingsButton />}
      />
      <PillButton
        label="Scan a lab report"
        sealIcon={scanIcon}
        onPress={() => router.push('/scan-report')}
        style={styles.scan}
      />

      {parameters.length ? (
        <>
          <View style={styles.parameters}>
            {parameters.map((parameter) => (
              <MetricCard key={parameter.id} parameter={parameter} />
            ))}
          </View>
          <DeleteReport onDelete={removeLatestReport} />
        </>
      ) : (
        <EmptyState />
      )}
    </Screen>
  );
}

/** What the tab says before the first scan. */
function EmptyState() {
  const theme = useTheme();

  return (
    <View style={[styles.empty, { backgroundColor: theme.surfaceElevated }]}>
      <SymbolView name={emptyIcon} size={26} tintColor={theme.textSecondary} />
      <ThemedText type="title">No report yet</ThemedText>
      <ThemedText type="body" themeColor="textSecondary" style={styles.emptyNote}>
        A photo of the printed report is enough. The AI reads every result into this tab, with
        a line on what each one measures, and keeps it on this device.
      </ThemedText>
    </View>
  );
}

/**
 * Taking the newest report back. It asks first — the row turns into the question — because
 * the photo and every result go with it, and a misread scan is exactly the kind of thing
 * someone wants to undo.
 */
function DeleteReport({ onDelete }: { onDelete: () => void }) {
  const theme = useTheme();
  const [confirming, setConfirming] = useState(false);

  if (!confirming) {
    return (
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Delete this report"
        onPress={() => setConfirming(true)}
        style={({ pressed }) => [styles.delete, pressed && styles.pressed]}>
        <SymbolView name={trashIcon} size={18} tintColor={theme.textMuted} />
        <ThemedText type="note" themeColor="textSecondary">
          Delete this report
        </ThemedText>
      </Pressable>
    );
  }

  return (
    <View style={[styles.confirm, { backgroundColor: theme.surfaceElevated }]}>
      <ThemedText type="rowTitle">Delete this report?</ThemedText>
      <ThemedText type="rowSub" themeColor="textSecondary">
        Its photo and every result go with it. Reports you scanned earlier stay.
      </ThemedText>
      <View style={styles.confirmActions}>
        <PillButton size="compact" tone="danger" label="Delete" onPress={onDelete} />
        <PillButton size="compact" tone="quiet" label="Keep" onPress={() => setConfirming(false)} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  scan: {
    marginTop: Spacing.one,
  },
  parameters: {
    gap: Spacing.three,
    marginTop: Spacing.one,
  },
  empty: {
    alignItems: 'center',
    gap: Spacing.two,
    borderRadius: Radius.xl,
    borderCurve: 'continuous',
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.five,
    marginTop: Spacing.one,
  },
  emptyNote: {
    textAlign: 'center',
  },
  delete: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.two,
    paddingVertical: Spacing.two,
  },
  confirm: {
    gap: Spacing.two,
    borderRadius: Radius.lg,
    borderCurve: 'continuous',
    padding: Spacing.three,
  },
  confirmActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  pressed: {
    opacity: 0.85,
  },
});
