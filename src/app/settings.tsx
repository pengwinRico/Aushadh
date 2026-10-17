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
import { aiSetup, builtInAi, isUsableBaseUrl, normaliseBaseUrl } from '@/data/ai';
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
 * where the AI is — the endpoint, the model and the key. All three are kept on the device,
 * and an empty field means "use the one the app was built with", so a build that shipped
 * with no AI at all can still be pointed at a model without being rebuilt.
 */
export default function SettingsScreen() {
  const theme = useTheme();
  const { theme: themeName, aiBaseUrl, aiModel, aiKey, setTheme, saveAi } = useSettings();
  const builtIn = builtInAi();

  const [endpoint, setEndpoint] = useState(aiBaseUrl);
  const [model, setModel] = useState(aiModel);
  const [key, setKey] = useState(aiKey);
  const [revealed, setRevealed] = useState(false);
  const [status, setStatus] = useState<'idle' | 'saving' | 'saved' | 'failed'>('idle');
  const [error, setError] = useState<string | null>(null);

  const typed = {
    // Stored the way the call uses it, so what is saved is what is called.
    baseUrl: normaliseBaseUrl(endpoint),
    model: model.trim(),
    apiKey: key.trim(),
  };
  const changed =
    typed.baseUrl !== aiBaseUrl || typed.model !== aiModel || typed.apiKey !== aiKey;
  const saving = status === 'saving';
  const badEndpoint = isUsableBaseUrl(endpoint)
    ? null
    : 'An endpoint starts with http:// or https://.';
  const setup = aiSetup({ baseUrl: endpoint, model });
  const isSet = Boolean(aiBaseUrl || aiModel || aiKey);

  function edit(set: (value: string) => void) {
    return (value: string) => {
      set(value);
      setStatus('idle');
      setError(null);
    };
  }

  async function save() {
    if (!changed || saving || badEndpoint) return;

    setStatus('saving');
    setError(null);

    try {
      await saveAi(typed);
      setEndpoint(typed.baseUrl);
      setStatus('saved');
    } catch (caught) {
      setStatus('failed');
      setError(caught instanceof Error ? caught.message : 'Could not save that.');
    }
  }

  async function clear() {
    setStatus('saving');
    setError(null);

    try {
      await saveAi({ baseUrl: '', model: '', apiKey: '' });
      setEndpoint('');
      setModel('');
      setKey('');
      setRevealed(false);
      setStatus('saved');
    } catch (caught) {
      setStatus('failed');
      setError(caught instanceof Error ? caught.message : 'Could not clear that.');
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
          <ThemedText type="title">AI</ThemedText>
          <ThemedText type="note" themeColor="textSecondary">
            {setup.ready
              ? 'A pack is read by this endpoint. An empty field uses what the app was built with.'
              : 'An endpoint and a model are all it takes. A key is only needed when the endpoint asks for one.'}
          </ThemedText>

          <TextField
            value={endpoint}
            onChangeText={edit(setEndpoint)}
            label="Endpoint"
            placeholder={builtIn.baseUrl || 'https://host/v1'}
            autoCapitalize="none"
            autoCorrect={false}
            spellCheck={false}
            autoComplete="off"
            textContentType="none"
            keyboardType="url"
            inputMode="url"
            accessibilityLabel="AI endpoint"
          />

          <TextField
            value={model}
            onChangeText={edit(setModel)}
            label="Model"
            placeholder={builtIn.model || 'model-name'}
            autoCapitalize="none"
            autoCorrect={false}
            spellCheck={false}
            autoComplete="off"
            textContentType="none"
            accessibilityLabel="AI model"
          />

          <TextField
            value={key}
            onChangeText={edit(setKey)}
            label="API key"
            placeholder={
              builtIn.hasKey ? 'The app was built with one' : 'Paste the key from your provider'
            }
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
              label={saving ? 'Saving…' : 'Save'}
              onPress={save}
              disabled={!changed || saving || Boolean(badEndpoint)}
            />
            <PillButton
              size="compact"
              tone="quiet"
              label={revealed ? 'Hide' : 'Show'}
              onPress={() => setRevealed((current) => !current)}
            />
            {isSet ? (
              <PillButton
                size="compact"
                tone="quiet"
                label="Clear"
                onPress={clear}
                disabled={saving}
              />
            ) : null}
          </View>

          {badEndpoint ? (
            <ThemedText type="note" themeColor="error">
              {badEndpoint}
            </ThemedText>
          ) : (
            <ThemedText type="note" themeColor="textSecondary">
              {setup.ready
                ? `Will call ${setup.callUrl}`
                : builtIn.baseUrl || builtIn.model
                  ? 'Nothing to call yet — no endpoint or model is set.'
                  : 'Nothing to call yet. This build shipped without one, so set both above — or rebuild with EXPO_PUBLIC_AI_BASE_URL and EXPO_PUBLIC_AI_MODEL.'}
            </ThemedText>
          )}

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
