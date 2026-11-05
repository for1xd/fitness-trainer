import { Icon } from '@/ui/icons/Icon';
import { router } from 'expo-router';
import { useDeferredValue, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, ScrollView, Switch, View } from 'react-native';

import { isAvailable } from '@/features/catalog/logic/availability';
import {
  EXERCISES,
  getMuscle,
  MUSCLE_GROUPS,
  muscleGroupOf,
  type MuscleGroup,
} from '@/features/catalog/data';
import { equipmentSet, useGym } from '@/features/gym/store';
import { normalize } from '@/features/nutrition/logic/search';
import { GroupDots } from '@/features/workouts/components/GroupDots';
import { useTheme } from '@/theme/ThemeProvider';
import { Header, Screen, Text, TextField } from '@/ui';

export default function ExercisesScreen() {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const gym = useGym((s) => s.gym);
  const equipment = useMemo(() => equipmentSet(gym), [gym]);
  const [query, setQuery] = useState('');
  const deferred = useDeferredValue(query);
  const [group, setGroup] = useState<MuscleGroup | null>(null);
  const [onlyMine, setOnlyMine] = useState(false);

  const list = useMemo(() => {
    const q = normalize(deferred);
    return EXERCISES.filter((e) => !group || muscleGroupOf(e.id) === group)
      .filter((e) => !onlyMine || isAvailable(e, equipment))
      .filter((e) => !q || normalize(`${e.name_uk} ${e.name_en}`).includes(q));
  }, [deferred, group, onlyMine, equipment]);

  return (
    <Screen edges={['top', 'bottom']}>
      <Header title={t('exercises.title')} />
      <TextField
        label={t('exercises.search')}
        hideLabel
        icon="magnify"
        placeholder={t('exercises.search')}
        value={query}
        onChangeText={setQuery}
        autoCorrect={false}
      />

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerClassName="gap-2"
      >
        {[null, ...MUSCLE_GROUPS].map((g) => {
          const on = group === g;
          return (
            <Pressable
              key={g ?? 'all'}
              accessibilityRole="radio"
              accessibilityState={{ checked: on }}
              aria-checked={on}
              onPress={() => setGroup(g)}
              className={`h-11 flex-row items-center gap-2 rounded-full px-4 ${on ? 'bg-ink' : 'bg-surface active:bg-line'}`}
            >
              {g ? <GroupDots groups={[g]} /> : null}
              <Text variant="label" className={on ? 'text-inverse' : ''}>
                {g ? t(`groups.${g}`) : t('exercises.all')}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>

      <View className="flex-row items-center gap-3">
        <Text variant="label" className="flex-1">
          {t('exercises.onlyMyGym')}
        </Text>
        <Switch
          accessibilityLabel={t('exercises.onlyMyGym')}
          value={onlyMine}
          onValueChange={setOnlyMine}
          trackColor={{ true: colors.ink, false: colors.line }}
          thumbColor={colors.raised}
        />
      </View>

      <Text variant="caption">{t('exercises.count', { count: list.length })}</Text>
      {list.length === 0 ? (
        <Text variant="body" className="text-muted">
          {t('exercises.empty')}
        </Text>
      ) : (
        <View className="overflow-hidden rounded-card border border-hairline bg-surface">
          {list.map((e, i) => {
            const available = isAvailable(e, equipment);
            return (
              <Pressable
                key={e.id}
                accessibilityRole="link"
                onPress={() => router.push({ pathname: '/exercises/[id]', params: { id: e.id } })}
                className={`min-h-16 flex-row items-center gap-3 px-4 py-3 active:bg-line ${i ? 'border-t border-line' : ''}`}
              >
                <GroupDots groups={[muscleGroupOf(e.id) ?? 'core']} size={10} />
                <View className="flex-1">
                  <Text variant="body">{e.name_uk}</Text>
                  <Text variant="caption">
                    {getMuscle(e.primary_muscle_id)?.name_uk}
                    {available ? '' : `, ${t('exercises.notInGym').toLowerCase()}`}
                  </Text>
                </View>
                <Icon name="chevron-right" size={20} color={colors.muted} />
              </Pressable>
            );
          })}
        </View>
      )}
    </Screen>
  );
}
