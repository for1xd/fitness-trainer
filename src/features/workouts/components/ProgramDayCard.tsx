import { router } from 'expo-router';
import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, View } from 'react-native';

import { getExercise } from '@/features/catalog/data';
import { Text } from '@/ui';

import { GroupDots } from './GroupDots';

interface Props {
  name: string;
  muscleFocus: string[];
  exercises: { exerciseId: string; sets: number; repsMin: number; repsMax: number }[];
  /** Позначка над назвою, напр. «Сьогодні за планом» */
  eyebrow?: string;
  footer?: ReactNode;
}

export function ProgramDayCard({ name, muscleFocus, exercises, eyebrow, footer }: Props) {
  const { t } = useTranslation();
  return (
    <View className="gap-3 rounded-3xl bg-surface p-4">
      <View className="gap-1">
        {eyebrow ? <Text variant="caption">{eyebrow}</Text> : null}
        <View className="flex-row items-center gap-3">
          <Text variant="number" className="flex-1">
            {name}
          </Text>
          <GroupDots groups={muscleFocus} size={10} />
        </View>
        <Text variant="caption">
          {muscleFocus.map((g) => t(`groups.${g}` as 'groups.chest')).join(', ')}
        </Text>
      </View>
      <View>
        {exercises.map((e, i) => {
          const ex = getExercise(e.exerciseId);
          const timed = ex?.load_type === 'timed';
          return (
            <Pressable
              key={`${e.exerciseId}-${i}`}
              accessibilityRole="link"
              onPress={() =>
                router.push({ pathname: '/exercises/[id]', params: { id: e.exerciseId } })
              }
              className={`min-h-12 flex-row items-center gap-3 py-2 active:opacity-60 ${i > 0 ? 'border-t border-line' : ''}`}
            >
              <Text variant="body" className="flex-1" numberOfLines={2}>
                {ex?.name_uk ?? e.exerciseId}
              </Text>
              <Text variant="label" className="text-muted">
                {t(timed ? 'workouts.setsSecs' : 'workouts.setsReps', {
                  sets: e.sets,
                  min: e.repsMin,
                  max: e.repsMax,
                })}
              </Text>
            </Pressable>
          );
        })}
      </View>
      {footer}
    </View>
  );
}
