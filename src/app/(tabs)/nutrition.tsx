import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';

import { EmptyState, Screen } from '@/ui';

export default function NutritionScreen() {
  const { t } = useTranslation();
  return (
    <Screen>
      <EmptyState
        icon="food-apple-outline"
        title={t('nutrition.emptyTitle')}
        body={t('nutrition.emptyBody')}
        actionLabel={t('nutrition.emptyAction')}
        onAction={() => router.navigate('/')}
      />
    </Screen>
  );
}
