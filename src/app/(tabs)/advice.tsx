import { useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { ChatBubble } from '@/components/chat-bubble';
import { PillButton } from '@/components/pill-button';
import { QuestionInput } from '@/components/question-input';
import { Screen } from '@/components/screen';
import { ScreenHeader } from '@/components/screen-header';
import { SettingsButton } from '@/components/settings-button';
import { SummaryCard } from '@/components/summary-card';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useProfile } from '@/context/profile';
import { adviceMessages, healthSummary } from '@/data/placeholders';

export default function AdviceScreen() {
  const { profile } = useProfile();
  const [question, setQuestion] = useState('');

  // The thread is placeholder copy until the model writes its own; the assistant opens
  // on the name captured at first run.
  const messages = useMemo(
    () =>
      adviceMessages.map((message) =>
        message.role === 'assistant' && profile
          ? { ...message, text: `Hi ${profile.name}. ${message.text}` }
          : message,
      ),
    [profile],
  );

  return (
    <Screen>
      <ScreenHeader
        title="Advice"
        subtitle="From your reports and medicines"
        action={<SettingsButton />}
      />
      <SummaryCard title="Your health summary" style={styles.summary}>
        <ThemedText type="body" themeColor="onPrimaryContainer">
          {healthSummary}
        </ThemedText>
        <PillButton
          size="compact"
          label="Refresh summary"
          onPress={() => {
            // TODO(summary): regenerate the summary from the current reports.
          }}
          style={styles.refresh}
        />
      </SummaryCard>
      <View style={styles.thread}>
        {messages.map((message) => (
          <ChatBubble key={message.id} message={message} />
        ))}
      </View>
      <QuestionInput
        value={question}
        onChangeText={setQuestion}
        onSend={() => {
          // TODO(ask-advice): send the question and append the answer to the thread.
        }}
      />
      <ThemedText type="note" themeColor="textSecondary" style={styles.disclaimer}>
        For information only. Not medical advice.
      </ThemedText>
    </Screen>
  );
}

const styles = StyleSheet.create({
  summary: {
    marginTop: Spacing.one,
  },
  refresh: {
    alignSelf: 'flex-start',
    marginTop: Spacing.three,
  },
  thread: {
    gap: Spacing.three,
    marginTop: Spacing.two,
  },
  disclaimer: {
    textAlign: 'center',
    marginTop: Spacing.two,
  },
});
