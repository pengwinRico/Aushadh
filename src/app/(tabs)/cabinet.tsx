import { StyleSheet, View } from 'react-native';

import { CategoryCard } from '@/components/category-card';
import { PillButton } from '@/components/pill-button';
import { Screen } from '@/components/screen';
import { ScreenHeader } from '@/components/screen-header';
import { Spacing } from '@/constants/theme';
import { medicineCategories, medicines } from '@/data/placeholders';

const plusIcon = { ios: 'plus', android: 'add', web: 'add' } as const;

export default function CabinetScreen() {
  return (
    <Screen>
      <ScreenHeader
        title="Cabinet"
        subtitle={`${medicines.length} medicines · ${medicineCategories.length} categories`}
      />
      <View style={styles.categories}>
        {medicineCategories.map((category) => (
          <CategoryCard key={category.id} category={category} />
        ))}
      </View>
      <PillButton
        label="Add medicine"
        sealIcon={plusIcon}
        onPress={() => {
          // TODO(add-medicine): capture a medicine and store it in the cabinet.
        }}
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
