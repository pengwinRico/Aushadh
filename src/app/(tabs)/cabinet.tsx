import { router } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { CategoryCard } from '@/components/category-card';
import { PillButton } from '@/components/pill-button';
import { Screen } from '@/components/screen';
import { ScreenHeader } from '@/components/screen-header';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useCabinet } from '@/context/cabinet';

const plusIcon = { ios: 'plus', android: 'add', web: 'add' } as const;

export default function CabinetScreen() {
  const { categories, removeMedicine } = useCabinet();

  // The store answers within a frame of the tab opening. Nothing is better than counts
  // that are a frame away from being right.
  if (!categories) return null;

  const medicines = categories.reduce((total, category) => total + category.medicines.length, 0);

  return (
    <Screen>
      <ScreenHeader
        title="Cabinet"
        subtitle={`${medicines} medicines · ${categories.length} categories`}
      />
      {categories.length === 0 ? (
        <ThemedText type="body" themeColor="textSecondary">
          Nothing here yet. Add the medicines you take.
        </ThemedText>
      ) : (
        <View style={styles.categories}>
          {categories.map((category, index) => (
            <CategoryCard
              key={category.id}
              category={category}
              initiallyExpanded={index === 0}
              onRemoveMedicine={removeMedicine}
            />
          ))}
        </View>
      )}
      <PillButton
        label="Add medicine"
        sealIcon={plusIcon}
        onPress={() => router.push('/add-medicine')}
        style={styles.add}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  categories: {
    gap: Spacing.three,
    marginTop: Spacing.one,
  },
  add: {
    alignSelf: 'flex-end',
    marginTop: Spacing.three,
  },
});
