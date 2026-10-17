import { Image } from 'expo-image';
import { router } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { PillButton } from '@/components/pill-button';
import { Screen } from '@/components/screen';
import { TextField } from '@/components/text-field';
import { ThemedText } from '@/components/themed-text';
import { Radius, ScreenPadding, Spacing } from '@/constants/theme';
import { useCabinet } from '@/context/cabinet';
import { useSettings } from '@/context/settings';
import { readMedicine, type MedicineReading } from '@/data/ai';
import { pickPhoto, type PickedPhoto } from '@/data/photo';
import { OTHER_CATEGORY } from '@/data/sql';
import { useTheme } from '@/hooks/use-theme';

const closeIcon = { ios: 'xmark', android: 'close', web: 'close' } as const;
const cameraIcon = { ios: 'camera', android: 'photo_camera', web: 'photo_camera' } as const;
const readIcon = { ios: 'wand.and.stars', android: 'auto_awesome', web: 'auto_awesome' } as const;
const addIcon = { ios: 'plus', android: 'add', web: 'add' } as const;

/** How tall the pack photo stands while the form is open. */
const TILE_HEIGHT = 148;
const PREVIEW_HEIGHT = 96;

type Step = 'capture' | 'review';

/**
 * Add a medicine.
 *
 * The user photographs the pack, or types its name; the AI names the medicine, says what
 * it is for and files it under a group. The answer comes back as editable fields — the
 * second step exists so the AI's reading is checked before it reaches the cabinet, and
 * nothing is written if the call fails.
 *
 * It writes through `useCabinet()`, which re-reads the store, so the cabinet behind the
 * sheet is already showing the new row by the time the sheet closes.
 */
export default function AddMedicineScreen() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { categories, addMedicine } = useCabinet();
  const { aiBaseUrl, aiModel, aiKey } = useSettings();
  const [step, setStep] = useState<Step>('capture');
  const [typed, setTyped] = useState('');
  const [photo, setPhoto] = useState<PickedPhoto | null>(null);
  const [reading, setReading] = useState<MedicineReading | null>(null);
  const [busy, setBusy] = useState<'reading' | 'saving' | null>(null);
  const [error, setError] = useState<string | null>(null);

  const canRead = (photo !== null || typed.trim().length > 0) && busy === null;
  const canSave = (reading?.name.trim().length ?? 0) > 0 && busy === null;

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
    if (!canRead) return;

    setBusy('reading');
    setError(null);

    try {
      const answer = await readMedicine({
        name: typed,
        photo: photo?.dataUrl,
        // The groups already on the shelf, so the model reuses one instead of inventing.
        groups: categories?.map((category) => category.name) ?? [],
        // Where Settings points the app: an empty value falls back to the build's.
        config: { baseUrl: aiBaseUrl, model: aiModel, apiKey: aiKey },
      });

      // A group the AI left empty is no answer; the store files those under `Other`, and
      // the field says so before it is saved.
      setReading({ ...answer, category: answer.category || OTHER_CATEGORY });
      setStep('review');
    } catch (caught) {
      // Nothing is written. The form stays up with the photo and the name, ready to retry.
      setError(message(caught));
    } finally {
      setBusy(null);
    }
  }

  async function addToCabinet() {
    if (!reading || !canSave) return;

    setBusy('saving');
    setError(null);

    try {
      await addMedicine({ ...reading, photo });
      router.back();
    } catch (caught) {
      setError(message(caught));
      setBusy(null);
    }
  }

  function change(field: keyof MedicineReading, value: string) {
    setReading((current) => (current ? { ...current, [field]: value } : current));
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
              <ThemedText type="display">Add medicine</ThemedText>
              <ThemedText type="subtitle" themeColor="textSecondary">
                Photograph the pack, or type its name — the AI fills in the rest.
              </ThemedText>
            </View>

            <Pressable
              accessibilityRole="button"
              accessibilityLabel={
                photo ? 'Take a new photo of the pack' : 'Take a photo of the pack'
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
                  accessibilityLabel="The pack photo you took"
                />
              ) : (
                <View style={styles.prompt}>
                  <SymbolView name={cameraIcon} size={26} tintColor={theme.textSecondary} />
                  <ThemedText type="buttonCompact" themeColor="textSecondary">
                    Take a photo of the pack
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

            <TextField
              label="Medicine name"
              value={typed}
              onChangeText={setTyped}
              placeholder="Paracetamol"
              autoCapitalize="words"
              accessibilityLabel="Medicine name"
            />

            <ThemedText type="note" themeColor="textSecondary">
              The photo goes to the AI you have set up; the medicine is kept on this device.
            </ThemedText>
          </>
        ) : (
          <>
            <View style={styles.heading}>
              <ThemedText type="display">Is this right?</ThemedText>
              <ThemedText type="subtitle" themeColor="textSecondary">
                {photo ? 'Read from your photo' : 'Read from the name you typed'} — change
                anything that is wrong.
              </ThemedText>
            </View>

            {photo ? (
              <Image
                source={{ uri: photo.preview }}
                style={[styles.photo, styles.preview]}
                contentFit="cover"
                accessibilityLabel="The pack photo you took"
              />
            ) : null}

            <TextField
              label="Medicine"
              value={reading?.name ?? ''}
              onChangeText={(value) => change('name', value)}
              placeholder="Paracetamol"
              autoCapitalize="words"
              accessibilityLabel="Medicine name"
            />
            <TextField
              label="Dose"
              value={reading?.dose ?? ''}
              onChangeText={(value) => change('dose', value)}
              placeholder="500 mg"
              accessibilityLabel="Dose"
            />
            <TextField
              label="What it's for"
              block
              value={reading?.purpose ?? ''}
              onChangeText={(value) => change('purpose', value)}
              placeholder="Relieves mild pain and lowers fever."
              accessibilityLabel="What it's for"
            />
            <TextField
              label="Category"
              value={reading?.category ?? ''}
              onChangeText={(value) => change('category', value)}
              placeholder={OTHER_CATEGORY}
              accessibilityLabel="Category"
            />

            <ThemedText type="note" themeColor="textSecondary">
              A category that is not in the cabinet yet is created for it.
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
              label={busy === 'saving' ? 'Adding…' : 'Add to cabinet'}
              sealIcon={addIcon}
              onPress={addToCabinet}
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
