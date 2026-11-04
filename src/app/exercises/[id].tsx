import { MaterialCommunityIcons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, View } from 'react-native';

import { alternatives, isAvailable } from '@/features/catalog/logic/availability';
import { EXERCISES, getExercise, getMachineType, getMuscle } from '@/features/catalog/data';
import { equipmentSet, useGym } from '@/features/gym/store';
import { useStrength } from '@/features/strength/store';
import { exerciseOneRm } from '@/features/workouts/logic/weights';
import { formatNumber } from '@/lib/format';
import { useTheme } from '@/theme/ThemeProvider';
import { EmptyState, Header, Notice, Screen, Text } from '@/ui';

export default function ExerciseScreen() {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const { id } = useLocalSearchParams<{ id: string }>();
  const exercise = getExercise(id);
  const gym = useGym((s) => s.gym);
  const equipment = useMemo(() => equipmentSet(gym), [gym]);
  const estimates = useStrength((s) => s.estimates);

  if (!exercise) {
    return (
      <Screen edges={['top', 'bottom']}>
        <Header title="" />
        <EmptyState
          icon="dumbbell"
          title={t('exercises.empty')}
          body=""
          actionLabel={t('exercises.title')}
          onAction={() => router.replace('/exercises')}
        />
      </Screen>
    );
  }

  const oneRm = exerciseOneRm(exercise, estimates);
  const alts = alternatives(exercise, EXERCISES, gym ? equipment : null);
  const muscles = (ids: string[]) => ids.map((m) => getMuscle(m)?.name_uk ?? m).join(', ');

  return (
    <Screen edges={['top', 'bottom']}>
      <Header title={exercise.name_uk} />

      {/* Місце під GIF / відео техніки */}
      <View className="aspect-video items-center justify-center gap-2 rounded-3xl bg-surface">
        <MaterialCommunityIcons name="play-circle-outline" size={40} color={colors.muted} />
        <Text variant="caption">{t('exercises.media')}</Text>
      </View>

      {gym && !isAvailable(exercise, equipment) ? (
        <Notice tone="warn" text={t('exercises.notInGym')} />
      ) : null}

      <View className="gap-3 rounded-2xl bg-surface p-4">
        <Row label={t('exercises.primary')} value={muscles([exercise.primary_muscle_id])} />
        {exercise.secondary_muscle_ids.length ? (
          <Row label={t('exercises.secondary')} value={muscles(exercise.secondary_muscle_ids)} />
        ) : null}
        <Row
          label={t('exercises.equipment')}
          value={
            exercise.required_equipment.length
              ? exercise.required_equipment.map((m) => getMachineType(m)?.name_uk ?? m).join(', ')
              : t('exercises.noEquipment')
          }
        />
        {oneRm ? (
          <Row
            label={t('exercises.oneRmLabel')}
            value={t('exercises.myOneRm', { value: formatNumber(oneRm, 1) })}
          />
        ) : null}
      </View>

      <View className="gap-2">
        <Text variant="heading">{t('exercises.technique')}</Text>
        <Text variant="body">{exercise.technique_uk}</Text>
      </View>

      <View className="gap-2">
        <Text variant="heading">{t('exercises.mistakes')}</Text>
        {exercise.mistakes_uk.map((m) => (
          <View key={m} className="flex-row gap-2">
            <MaterialCommunityIcons name="close-circle-outline" size={20} color={colors.danger} />
            <Text variant="body" className="flex-1">
              {m}
            </Text>
          </View>
        ))}
      </View>

      {alts.length ? (
        <View className="gap-2">
          <Text variant="heading">{t('exercises.alternatives')}</Text>
          <View className="overflow-hidden rounded-2xl bg-surface">
            {alts.map((a, i) => (
              <Pressable
                key={a.id}
                accessibilityRole="link"
                onPress={() => router.push({ pathname: '/exercises/[id]', params: { id: a.id } })}
                className={`min-h-14 flex-row items-center gap-3 px-4 active:bg-line ${i ? 'border-t border-line' : ''}`}
              >
                <Text variant="body" className="flex-1">
                  {a.name_uk}
                </Text>
                <MaterialCommunityIcons name="chevron-right" size={20} color={colors.muted} />
              </Pressable>
            ))}
          </View>
        </View>
      ) : null}
    </Screen>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <View className="gap-0.5">
      <Text variant="caption">{label}</Text>
      <Text variant="body">{value}</Text>
    </View>
  );
}
