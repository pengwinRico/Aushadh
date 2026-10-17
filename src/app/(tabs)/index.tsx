import { StyleSheet, View } from 'react-native';

import { MetricCard } from '@/components/metric-card';
import { PillButton } from '@/components/pill-button';
import { Screen } from '@/components/screen';
import { ScreenHeader } from '@/components/screen-header';
import { SettingsButton } from '@/components/settings-button';
import { Spacing } from '@/constants/theme';
import { labParameters } from '@/data/placeholders';

const plusIcon = { ios: 'plus', android: 'add', web: 'add' } as const;

export default function ReportsScreen() {
  return (
    <Screen>
      <ScreenHeader
        title="Reports"
        subtitle={`${labParameters.length} parameters · updated today`}
        action={<SettingsButton />}
      />
      <PillButton
        label="Scan a lab report"
        sealIcon={plusIcon}
        onPress={() => {
          // TODO(scan-report): import a report and read the parameters from it.
        }}
        style={styles.scan}
      />
      <View style={styles.parameters}>
        {labParameters.map((parameter) => (
          <MetricCard key={parameter.id} parameter={parameter} />
        ))}
      </View>
    </Screen>
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
});
