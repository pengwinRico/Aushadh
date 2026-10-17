import { router } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, StyleSheet, View } from 'react-native';

import { PillButton } from '@/components/pill-button';
import { Screen } from '@/components/screen';
import { SegmentedControl, type Segment } from '@/components/segmented-control';
import { TextField } from '@/components/text-field';
import { ThemedText } from '@/components/themed-text';
import { Radius, Spacing } from '@/constants/theme';
import { useSettings } from '@/context/settings';
import { aiSetup } from '@/data/ai';
import { useTheme } from '@/hooks/use-theme';

const closeIcon = { ios: 'xmark', android: 'close', web: 'close' } as const;

const themeOptions: readonly Segment<'light' | 'dark'>[] = [
  {
    value: 'light',
    label: 'Light',
    icon: { ios: 'sun.max', android: 'light_mode', web: 'light_mode' },
  },
  {
    value: 'dark',
    label: 'Dark',
    icon: { ios: 'moon', android: 'dark_mode', web: 'dark_mode' },
  },
];

/**
 * Settings, reachable from every tab.
 *
 * Two things live here: the theme, which repaints the whole app the moment it changes, and
 * the key the model is called with, so a user can bring their own instead of using the one
 * the app was built with. Both are kept on the device.
 */
export default function SettingsScreen() {
  const theme = useTheme();
  const { theme: themeName, aiKey, setTheme, saveAiKey } = useSettings();
  const setup = aiSetup();

  const [draft, setDraft] = useState(aiKey);
  const [revealed, setRevealed] = useState(false);
  const [status, setStatus] = useState<'idle' | 'saving' | 'saved' | 'failed'>('idle');
  const [error, setError] = useState<string | null>(null);

  const changed = draft.trim() !== aiKey;
  const saving = status === 'saving';

  async function saveKey() {
    if (!changed || saving) return;

    setStatus('saving');
    setError(null);

    try {
      await saveAiKey(draft);
      setDraft(draft.trim());
      setStatus('saved');
    } catch (caught) {
      setStatus('failed');
      setError(caught instanceof Error ? caught.message : 'Could not save the key.');
    }
  }

  async function clearKey() {
    setStatus('saving');
    setError(null);

    try {
      await saveAiKey('');
      setDraft('');
      setStatus('saved');
    } catch (caught) {
      setStatus('failed');
      setError(caught instanceof Error ? caught.message : 'Could not clear the key.');
    }
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={[styles.screen, { backgroundColor: theme.background }]}>
      <Screen>
        <View style={styles.topBar}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Close settings"
            hitSlop={12}
            onPress={() => router.back()}
            style={({ pressed }) => (pressed ? styles.pressed : null)}>
            <SymbolView name={closeIcon} size={24} tintColor={theme.textSecondary} />
          </Pressable>
        </View>

        <View style={styles.heading}>
          <ThemedText type="display">Settings</ThemedText>
          <ThemedText type="subtitle" themeColor="textSecondary">
            How the app looks, and the AI that reads your medicines.
          </ThemedText>
        </View>

        <View style={[styles.card, { backgroundColor: theme.surface }]}>
          <ThemedText type="title">Appearance</ThemedText>
          <SegmentedControl
            label="Theme"
            options={themeOptions}
            value={themeName}
            onChange={(next) => {
              void setTheme(next);
            }}
          />
        </View>

        <View style={[styles.card, { backgroundColor: theme.surface }]}>
          <ThemedText type="title">AI key</ThemedText>
          <ThemedText type="note" themeColor="textSecondary">
            {setup
              ? `Sent to ${setup.host}, asking ${setup.model}.`
              : 'This build has no AI endpoint, so a key alone cannot read a pack.'}
          </ThemedText>

          <TextField
            value={draft}
            onChangeText={(value) => {
              setDraft(value);
              setStatus('idle');
              setError(null);
            }}
            label="Your key"
            placeholder="Paste the key from your AI provider"
            autoCapitalize="none"
            autoCorrect={false}
            spellCheck={false}
            autoComplete="off"
            textContentType="none"
            secureTextEntry={!revealed}
            accessibilityLabel="AI API key"
          />

          <View style={styles.actions}>
            <PillButton
              size="compact"
              label={saving ? 'Saving…' : 'Save key'}
              onPress={saveKey}
              disabled={!changed || saving}
            />
            <PillButton
              size="compact"
              tone="quiet"
              label={revealed ? 'Hide' : 'Show'}
              onPress={() => setRevealed((current) => !current)}
            />
            {aiKey ? (
              <PillButton
                size="compact"
                tone="quiet"
                label="Clear"
                onPress={clearKey}
                disabled={saving}
              />
            ) : null}
          </View>

          {status === 'saved' ? (
            <ThemedText type="note" themeColor="textSecondary">
              Saved on this device.
            </ThemedText>
          ) : null}
          {error ? (
            <ThemedText type="note" themeColor="error">
              {error}
            </ThemedText>
          ) : null}

          <ThemedText type="note" themeColor="textSecondary">
            Kept on this device and sent only to the AI above. A key typed here replaces the
            one the app was built with.
          </ThemedText>
        </View>
      </Screen>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  topBar: {
    alignItems: 'flex-end',
  },
  heading: {
    gap: Spacing.half,
  },
  card: {
    borderRadius: Radius.xl,
    borderCurve: 'continuous',
    padding: Spacing.four,
    gap: Spacing.three,
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: Spacing.two,
  },
  pressed: {
    opacity: 0.8,
  },
});
