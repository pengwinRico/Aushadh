import { SymbolView } from 'expo-symbols';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, StyleSheet, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { PillButton } from '@/components/pill-button';
import { Seal } from '@/components/seal';
import { ThemedText } from '@/components/themed-text';
import { MaxContentWidth, Radius, ScreenPadding, Spacing, Type } from '@/constants/theme';
import { useProfile } from '@/context/profile';
import { useTheme } from '@/hooks/use-theme';

/** A medical bag stands for aushadh here; the pill already means the Cabinet tab. */
const mark = { ios: 'cross.case.fill', android: 'medical_services', web: 'medical_services' } as const;

/**
 * First run. This is the only screen reachable until a name is stored — the root
 * navigator's guard swaps to the tabs the moment `saveName` lands, so nothing here
 * needs to navigate.
 */
export default function WelcomeScreen() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { saveName } = useProfile();
  const [name, setName] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const canContinue = name.trim().length > 0 && !isSaving;

  async function continueToApp() {
    if (!canContinue) return;

    setIsSaving(true);

    try {
      await saveName(name);
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={[styles.screen, { backgroundColor: theme.background }]}>
      <View
        style={[
          styles.content,
          {
            paddingTop: insets.top + Spacing.five,
            paddingBottom: insets.bottom + Spacing.five,
          },
        ]}>
        <View style={styles.intro}>
          <Seal size={96} color={theme.primaryContainer}>
            <SymbolView name={mark} size={40} tintColor={theme.onPrimaryContainer} />
          </Seal>
          <ThemedText type="display">Aushadh</ThemedText>
          <ThemedText type="subtitle" themeColor="textSecondary" style={styles.tagline}>
            Photos of your reports and medicine packs, kept as records you can track. Read on this
            device, never in the cloud.
          </ThemedText>
        </View>

        <View style={styles.form}>
          <ThemedText type="section">What should we call you?</ThemedText>
          <TextInput
            value={name}
            onChangeText={setName}
            onSubmitEditing={continueToApp}
            placeholder="First name"
            placeholderTextColor={theme.textMuted}
            autoFocus
            autoCapitalize="words"
            autoComplete="given-name"
            returnKeyType="done"
            accessibilityLabel="Your first name"
            style={[
              Type.subtitle,
              styles.field,
              { backgroundColor: theme.surfaceElevated, color: theme.text },
            ]}
          />
          <ThemedText type="note" themeColor="textSecondary">
            Stays on this device. No account, no cloud.
          </ThemedText>
          <PillButton
            label="Continue"
            onPress={continueToApp}
            disabled={!canContinue}
            style={styles.cta}
          />
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  content: {
    flex: 1,
    width: '100%',
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
    justifyContent: 'center',
    paddingHorizontal: ScreenPadding,
    gap: Spacing.six,
  },
  intro: {
    alignItems: 'center',
    gap: Spacing.three,
  },
  tagline: {
    textAlign: 'center',
  },
  form: {
    gap: Spacing.two,
  },
  field: {
    height: 56,
    borderRadius: Radius.full,
    paddingHorizontal: Spacing.four,
    paddingVertical: 0,
  },
  cta: {
    alignSelf: 'stretch',
    justifyContent: 'center',
    marginTop: Spacing.three,
  },
});
