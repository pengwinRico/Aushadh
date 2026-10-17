import { StyleSheet, TextInput, View, type TextInputProps } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Radius, Spacing, Type } from '@/constants/theme';
import { useSettings } from '@/context/settings';
import { useTheme } from '@/hooks/use-theme';

type TextFieldProps = TextInputProps & {
  /** Shown above the field. Forms label every input; first run uses its own heading. */
  label?: string;
  /** Grows into a block for longer copy, such as what a medicine is for. */
  block?: boolean;
};

/**
 * An input on the elevated surface — the first-run name field and the form fields. It
 * carries the type style and the placeholder colour so no screen restates them.
 */
export function TextField({ label, block, style, ...rest }: TextFieldProps) {
  const theme = useTheme();
  const { theme: themeName } = useSettings();

  return (
    <View style={styles.field}>
      {label ? (
        <ThemedText type="meta" themeColor="textSecondary">
          {label}
        </ThemedText>
      ) : null}
      <TextInput
        multiline={block}
        textAlignVertical={block ? 'top' : 'center'}
        placeholderTextColor={theme.textMuted}
        keyboardAppearance={themeName === 'dark' ? 'dark' : 'light'}
        style={[
          Type.subtitle,
          block ? styles.block : styles.pill,
          { backgroundColor: theme.surfaceElevated, color: theme.text },
          style,
        ]}
        {...rest}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  field: {
    gap: Spacing.two,
  },
  pill: {
    height: 56,
    borderRadius: Radius.full,
    paddingHorizontal: Spacing.four,
    paddingVertical: 0,
  },
  block: {
    minHeight: 88,
    borderRadius: Radius.lg,
    borderCurve: 'continuous',
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.three,
  },
});
