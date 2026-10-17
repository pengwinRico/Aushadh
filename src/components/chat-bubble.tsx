import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Radius, Spacing } from '@/constants/theme';
import type { ChatMessage } from '@/data/placeholders';
import { useTheme } from '@/hooks/use-theme';

/** Bubble padding, sampled from the thread in the design. */
const BUBBLE_PADDING = 12;

/** A question or an answer in the advice thread. */
export function ChatBubble({ message }: { message: ChatMessage }) {
  const theme = useTheme();
  const fromUser = message.role === 'user';

  return (
    <View
      style={[
        styles.bubble,
        fromUser
          ? [styles.fromUser, { backgroundColor: theme.primary }]
          : [styles.fromAssistant, { backgroundColor: theme.surface }],
      ]}>
      <ThemedText type="body" themeColor={fromUser ? 'onPrimary' : 'text'}>
        {message.text}
      </ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  bubble: {
    maxWidth: '85%',
    borderRadius: Radius.lg,
    borderCurve: 'continuous',
    paddingHorizontal: Spacing.three,
    paddingVertical: BUBBLE_PADDING,
  },
  fromUser: {
    alignSelf: 'flex-end',
    /** Squared-off corner on the side the bubble speaks from. */
    borderBottomRightRadius: Radius.sm,
  },
  fromAssistant: {
    alignSelf: 'flex-start',
    borderBottomLeftRadius: Radius.sm,
  },
});
