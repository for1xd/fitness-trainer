import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';

import { EmptyState, Screen } from '@/ui';

export default function WorkoutsScreen() {
  const { t } = useTranslation();
  return (
    <Screen>
      <EmptyState
        icon="dumbbell"
        title={t('workouts.emptyTitle')}
        body={t('workouts.emptyBody')}
        actionLabel={t('workouts.emptyAction')}
        onAction={() => router.navigate('/')}
      />
    </Screen>
  );
}
