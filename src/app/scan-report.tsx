import { Image } from 'expo-image';
import { router } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { PillButton } from '@/components/pill-button';
import { Screen } from '@/components/screen';
import { StatusBadge } from '@/components/status-badge';
import { TextField } from '@/components/text-field';
import { ThemedText } from '@/components/themed-text';
import { Radius, ScreenPadding, Spacing } from '@/constants/theme';
import { statusTones } from '@/constants/tones';
import { useReports } from '@/context/reports';
import { useSettings } from '@/context/settings';
import { readReport } from '@/data/ai';
import { pickPhoto, type PickedPhoto } from '@/data/photo';
import type { LabStatus, ReportParameter } from '@/data/reports';
import { useTheme } from '@/hooks/use-theme';

const closeIcon = { ios: 'xmark', android: 'close', web: 'close' } as const;
const cameraIcon = { ios: 'camera', android: 'photo_camera', web: 'photo_camera' } as const;
const readIcon = { ios: 'wand.and.stars', android: 'auto_awesome', web: 'auto_awesome' } as const;
const saveIcon = { ios: 'checkmark', android: 'check', web: 'check' } as const;

/** How tall the report photo stands while the form is open. */
const TILE_HEIGHT = 200;
const PREVIEW_HEIGHT = 96;

/** The order the badge cycles through when it is tapped. */
const STATUS_ORDER: readonly LabStatus[] = ['low', 'normal', 'high'];

const statusLabels: Record<LabStatus, string> = {
  low: 'Low',
  normal: 'Normal',
  high: 'High',
};

type Step = 'capture' | 'review';

/** The fields a result carries besides its status, which is picked rather than typed. */
type TextParameter = Exclude<keyof ReportParameter, 'status'>;

/**
 * Scan a lab report.
 *
 * The user photographs the printed report, or chooses a picture of it; the AI reads every
 * result into the form, with the range it was measured against and a line on what it means.
 * The answer comes back as editable fields — the second step exists so the reading is
 * checked before it reaches the tab, and nothing is written if the call fails.
 *
 * It writes through `useReports()`, which re-reads the store, so the Reports tab behind the
 * sheet is already showing the new results by the time the sheet closes.
 */
export default function ScanReportScreen() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { addReport } = useReports();
  const { aiBaseUrl, aiModel, aiKey } = useSettings();
  const [step, setStep] = useState<Step>('capture');
  const [photo, setPhoto] = useState<PickedPhoto | null>(null);
  const [reading, setReading] = useState<ReportParameter[] | null>(null);
  const [busy, setBusy] = useState<'reading' | 'saving' | null>(null);
  const [error, setError] = useState<string | null>(null);

  const canRead = photo !== null && busy === null;
  // A result with no name or no value is not something the tab can show, so it has to be
  // filled in before the report is saved.
  const canSave =
    (reading?.length ?? 0) > 0 &&
    (reading ?? []).every(
      (parameter) => parameter.name.trim().length > 0 && parameter.value.trim().length > 0,
    ) &&
    busy === null;

  async function photograph(source: 'camera' | 'library') {
    setError(null);

    try {
      const picked = await pickPhoto(source);

      // A cancelled picker leaves whatever was there before.
      if (picked) setPhoto(picked);
    } catch (caught) {
      setError(message(caught));
    }
  }

  async function askTheAi() {
    if (!photo || !canRead) return;

    setBusy('reading');
    setError(null);

    try {
      const parameters = await readReport({
        photo: photo.dataUrl,
        // Where Settings points the app: an empty value falls back to the build's.
        config: { baseUrl: aiBaseUrl, model: aiModel, apiKey: aiKey },
      });

      setReading(parameters);
      setStep('review');
    } catch (caught) {
      // Nothing is written. The form stays up with the photo, ready to retry.
      setError(message(caught));
    } finally {
      setBusy(null);
    }
  }

  async function saveReport() {
    if (!reading || !canSave) return;

    setBusy('saving');
    setError(null);

    try {
      await addReport({ parameters: reading, photo });
      router.back();
    } catch (caught) {
      setError(message(caught));
      setBusy(null);
    }
  }

  function change(index: number, field: TextParameter, value: string) {
    // A computed key over a union of fields reads as a plain string map to TypeScript, so
    // the patch is built as one and narrowed on the way in.
    const patch: Partial<Record<TextParameter, string>> = { [field]: value };

    edit(index, patch);
  }

  function edit(index: number, patch: Partial<ReportParameter>) {
    setReading((current) =>
      current
        ? current.map((parameter, at) => (at === index ? { ...parameter, ...patch } : parameter))
        : current,
    );
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={styles.screen}>
      <Screen style={styles.body}>
        <View style={styles.topBar}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Close"
            hitSlop={12}
            onPress={() => router.back()}
            style={({ pressed }) => (pressed ? styles.pressed : null)}>
            <SymbolView name={closeIcon} size={24} tintColor={theme.textSecondary} />
          </Pressable>
        </View>

        {step === 'capture' ? (
          <>
            <View style={styles.heading}>
              <ThemedText type="display">Scan a lab report</ThemedText>
              <ThemedText type="subtitle" themeColor="textSecondary">
                Photograph the printed report — the AI reads every result from it.
              </ThemedText>
            </View>

            <Pressable
              accessibilityRole="button"
              accessibilityLabel={
                photo ? 'Take a new photo of the report' : 'Take a photo of the report'
              }
              onPress={() => photograph('camera')}
              style={({ pressed }) => [
                styles.tile,
                { backgroundColor: theme.surfaceElevated },
                pressed && styles.pressed,
              ]}>
              {photo ? (
                <Image
                  source={{ uri: photo.preview }}
                  style={styles.photo}
                  contentFit="cover"
                  accessibilityLabel="The report photo you took"
                />
              ) : (
                <View style={styles.prompt}>
                  <SymbolView name={cameraIcon} size={26} tintColor={theme.textSecondary} />
                  <ThemedText type="buttonCompact" themeColor="textSecondary">
                    Take a photo of the report
                  </ThemedText>
                </View>
              )}
            </Pressable>

            <View style={styles.alongside}>
              <PillButton
                size="compact"
                tone="quiet"
                label="Choose from photos"
                onPress={() => photograph('library')}
              />
              {photo ? (
                <ThemedText type="note" themeColor="textSecondary">
                  Tap the photo to take a new one.
                </ThemedText>
              ) : null}
            </View>

            <ThemedText type="note" themeColor="textSecondary">
              The photo goes to the AI you have set up; the results are kept on this device.
            </ThemedText>
          </>
        ) : (
          <>
            <View style={styles.heading}>
              <ThemedText type="display">Is this right?</ThemedText>
              <ThemedText type="subtitle" themeColor="textSecondary">
                Read from your photo — change anything that is wrong.
              </ThemedText>
            </View>

            {photo ? (
              <Image
                source={{ uri: photo.preview }}
                style={[styles.photo, styles.preview]}
                contentFit="cover"
                accessibilityLabel="The report photo you took"
              />
            ) : null}

            {/* One card per result. The card is the grouping surface, not the elevated one: a
                text field is drawn on `surfaceElevated`, so a card of that colour would
                swallow the fields inside it. */}
            {(reading ?? []).map((parameter, index) => (
              <View
                key={index}
                style={[styles.entry, { backgroundColor: theme.surface }]}>
                <TextField
                  label="Test"
                  value={parameter.name}
                  onChangeText={(value) => change(index, 'name', value)}
                  placeholder="Hemoglobin"
                  autoCapitalize="words"
                  accessibilityLabel={`Test ${index + 1}`}
                />
                <View style={styles.pair}>
                  <View style={styles.half}>
                    <TextField
                      label="Value"
                      value={parameter.value}
                      onChangeText={(value) => change(index, 'value', value)}
                      placeholder="11.2"
                      accessibilityLabel={`Value of test ${index + 1}`}
                    />
                  </View>
                  <View style={styles.half}>
                    <TextField
                      label="Unit"
                      value={parameter.unit}
                      onChangeText={(value) => change(index, 'unit', value)}
                      placeholder="g/dL"
                      accessibilityLabel={`Unit of test ${index + 1}`}
                    />
                  </View>
                </View>
                <TextField
                  label="Reference range"
                  value={parameter.referenceRange}
                  onChangeText={(value) => change(index, 'referenceRange', value)}
                  placeholder="12.0–15.5"
                  accessibilityLabel={`Reference range of test ${index + 1}`}
                />
                <View style={styles.status}>
                  <ThemedText type="meta" themeColor="textSecondary">
                    Status
                  </ThemedText>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={`${parameter.name} is ${statusLabels[parameter.status]}. Tap to change it.`}
                    onPress={() =>
                      edit(index, {
                        status:
                          STATUS_ORDER[
                            (STATUS_ORDER.indexOf(parameter.status) + 1) % STATUS_ORDER.length
                          ] ?? 'normal',
                      })
                    }
                    style={({ pressed }) => (pressed ? styles.pressed : null)}>
                    <StatusBadge
                      label={statusLabels[parameter.status]}
                      color={theme[statusTones[parameter.status].accent]}
                    />
                  </Pressable>
                  <ThemedText type="note" themeColor="textSecondary">
                    Tap to change
                  </ThemedText>
                </View>
                <TextField
                  label="What it means"
                  block
                  value={parameter.insight}
                  onChangeText={(value) => change(index, 'insight', value)}
                  placeholder="Carries oxygen from your lungs to the rest of your body."
                  accessibilityLabel={`What test ${index + 1} means`}
                />
              </View>
            ))}

            <ThemedText type="note" themeColor="textSecondary">
              Every scan is kept, so the next one can show what changed.
            </ThemedText>
          </>
        )}

        {error ? (
          <ThemedText type="body" themeColor="error">
            {error}
          </ThemedText>
        ) : null}
      </Screen>

      {/* The fields scroll; the action stays where the thumb is. */}
      <View style={[styles.footer, { paddingBottom: insets.bottom + Spacing.three }]}>
        {step === 'capture' ? (
          <PillButton
            label={busy === 'reading' ? 'Reading…' : 'Read with AI'}
            sealIcon={readIcon}
            onPress={askTheAi}
            disabled={!canRead}
            style={styles.cta}
          />
        ) : (
          <View style={styles.actions}>
            <PillButton
              label="Back"
              tone="quiet"
              onPress={() => setStep('capture')}
              disabled={busy !== null}
            />
            <PillButton
              label={busy === 'saving' ? 'Saving…' : 'Save report'}
              sealIcon={saveIcon}
              onPress={saveReport}
              disabled={!canSave}
              style={styles.ctaGrow}
            />
          </View>
        )}
      </View>
    </KeyboardAvoidingView>
  );
}

/** The sentence to show for a failure: the AI's own words, or a plain fallback. */
function message(error: unknown) {
  return error instanceof Error ? error.message : 'Something went wrong. Try again.';
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  body: {
    flex: 1,
  },
  topBar: {
    alignItems: 'flex-end',
  },
  heading: {
    gap: Spacing.half,
  },
  tile: {
    height: TILE_HEIGHT,
    borderRadius: Radius.xl,
    borderCurve: 'continuous',
    overflow: 'hidden',
    justifyContent: 'center',
  },
  prompt: {
    alignItems: 'center',
    gap: Spacing.two,
  },
  photo: {
    width: '100%',
    height: TILE_HEIGHT,
  },
  preview: {
    height: PREVIEW_HEIGHT,
    borderRadius: Radius.lg,
    borderCurve: 'continuous',
  },
  alongside: {
    alignItems: 'flex-start',
    gap: Spacing.two,
  },
  entry: {
    gap: Spacing.three,
    borderRadius: Radius.xl,
    borderCurve: 'continuous',
    padding: Spacing.three,
  },
  pair: {
    flexDirection: 'row',
    gap: Spacing.three,
  },
  half: {
    flex: 1,
  },
  status: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
  },
  footer: {
    paddingHorizontal: ScreenPadding,
    paddingTop: Spacing.two,
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  cta: {
    alignSelf: 'stretch',
    justifyContent: 'center',
  },
  ctaGrow: {
    flex: 1,
    justifyContent: 'center',
  },
  pressed: {
    opacity: 0.85,
  },
});
