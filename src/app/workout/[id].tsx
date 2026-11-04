import { router, useLocalSearchParams } from 'expo-router';
import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';

import { getExercise } from '@/features/catalog/data';
import { tonnageKg } from '@/features/workouts/logic/summary';
import { useWorkouts } from '@/features/workouts/store';
import type { WorkoutSet } from '@/features/workouts/types';
import { confirmAction } from '@/lib/confirm';
import { parseIsoDate } from '@/lib/dates';
import { formatLongDate, formatNumber } from '@/lib/format';
import { Button, EmptyState, Header, Notice, Screen, Text } from '@/ui';

export default function WorkoutDetailScreen() {
  const { t } = useTranslation();
  const { id, message } = useLocalSearchParams<{ id: string; message?: string }>();
  const workout = useWorkouts((s) => s.workouts.find((w) => w.id === id));
  const deleteWorkout = useWorkouts((s) => s.deleteWorkout);

  const byExercise = useMemo(() => {
    const groups = new Map<string, WorkoutSet[]>();
    for (const s of workout?.sets ?? []) {
      const key = `${s.position}:${s.exerciseId}`;
      groups.set(key, [...(groups.get(key) ?? []), s]);
    }
    return [...groups.values()];
  }, [workout]);

  if (!workout) {
    return (
      <Screen edges={['top', 'bottom']}>
        <Header title="" onBack={() => router.replace('/workouts')} />
        <EmptyState
          icon="dumbbell"
          title={t('workoutDetail.notFound')}
          body=""
          actionLabel={t('workouts.title')}
          onAction={() => router.replace('/workouts')}
        />
      </Screen>
    );
  }

  const dateLabel = formatLongDate(parseIsoDate(workout.date));

  const remove = async () => {
    const ok = await confirmAction({
      title: t('workoutDetail.deleteTitle', { name: workout.name, date: dateLabel }),
      message: t('workoutDetail.deleteBody'),
      confirmLabel: t('workoutDetail.delete'),
      cancelLabel: t('common.cancel'),
      destructive: true,
    });
    if (!ok) return;
    deleteWorkout(workout.id);
    router.replace('/workouts');
  };

  return (
    <Screen
      edges={['top', 'bottom']}
      footer={
        <Button label={t('workoutDetail.delete')} variant="danger" onPress={() => void remove()} />
      }
    >
      <Header
        title={workout.name}
        onBack={() => (router.canGoBack() ? router.back() : router.replace('/workouts'))}
      />
      {message ? <Notice text={message} /> : null}

      <View>
        <Text variant="hero">{formatNumber(tonnageKg(workout.sets))}</Text>
        <Text variant="caption">{t('workoutDetail.tonnageLabel')}</Text>
      </View>

      <View className="gap-1">
        <Text variant="body">{dateLabel}</Text>
        <Text variant="caption">
          {[
            workout.durationMin ? t('workouts.duration', { min: workout.durationMin }) : null,
            workout.wellbeing
              ? t('workoutDetail.wellbeing', {
                  value: t(
                    `live.wellbeing.${workout.wellbeing}` as 'live.wellbeing.1',
                  ).toLowerCase(),
                })
              : null,
          ]
            .filter(Boolean)
            .join(', ')}
        </Text>
        {workout.notes ? (
          <Text variant="body" className="pt-2">
            {workout.notes}
          </Text>
        ) : null}
      </View>

      {byExercise.map((sets) => {
        const ex = getExercise(sets[0]!.exerciseId);
        const timed = ex?.load_type === 'timed';
        return (
          <View
            key={`${sets[0]!.position}-${sets[0]!.exerciseId}`}
            className="gap-2 rounded-2xl bg-surface p-4"
          >
            <Text variant="heading">{ex?.name_uk ?? sets[0]!.exerciseId}</Text>
            {sets.map((s) => (
              <View key={s.id} className="flex-row items-center gap-3">
                <Text variant="caption" className="w-6">
                  {s.setIndex + 1}
                </Text>
                <Text variant="body" className="flex-1">
                  {s.weightKg > 0 ? `${formatNumber(s.weightKg, 1)} ${t('common.kg')} × ` : ''}
                  {s.reps}
                  {timed ? ` ${t('live.secs').toLowerCase()}` : ''}
                </Text>
                {s.rpe ? <Text variant="caption">{`${t('live.rpeShort')} ${s.rpe}`}</Text> : null}
              </View>
            ))}
          </View>
        );
      })}
    </Screen>
  );
}
