import { SymbolView } from 'expo-symbols';
import type { ComponentProps } from 'react';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';

import { Seal } from '@/components/seal';
import { Radius, Spacing, Type } from '@/constants/theme';
import { useSettings } from '@/context/settings';
import { useTheme } from '@/hooks/use-theme';

type SymbolName = ComponentProps<typeof SymbolView>['name'];

const sendIcon: SymbolName = { ios: 'arrow.up', android: 'arrow_upward', web: 'arrow_upward' };

type QuestionInputProps = {
  value: string;
  onChangeText: (value: string) => void;
  onSend?: () => void;
};

/**
 * The ask-a-question field from the advice screen: a rounded field with the send seal
 * tucked inside its trailing edge.
 */
export function QuestionInput({ value, onChangeText, onSend }: QuestionInputProps) {
  const theme = useTheme();
  const { theme: themeName } = useSettings();

  return (
    <View style={[styles.container, { backgroundColor: theme.surfaceElevated }]}>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        onSubmitEditing={onSend}
        placeholder="Ask a question"
        placeholderTextColor={theme.textMuted}
        keyboardAppearance={themeName === 'dark' ? 'dark' : 'light'}
        returnKeyType="send"
        accessibilityLabel="Ask a question"
        style={[Type.subtitle, styles.input, { color: theme.text }]}
      />
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Send question"
        onPress={onSend}
        style={({ pressed }) => (pressed ? styles.pressed : null)}>
        <Seal size={44} color={theme.primary}>
          <SymbolView name={sendIcon} size={20} tintColor={theme.onPrimary} />
        </Seal>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: Radius.full,
    paddingLeft: Spacing.four,
    /** The seal sits just inside the field's edge, as drawn. */
    paddingRight: Spacing.one,
    gap: Spacing.two,
  },
  input: {
    flex: 1,
    paddingVertical: 0,
  },
  pressed: {
    opacity: 0.85,
  },
});
