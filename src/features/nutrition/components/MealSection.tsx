import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Pressable, View } from 'react-native';

import { formatNumber } from '@/lib/format';
import { IconButton, Text } from '@/ui';

import type { MealGroup } from '../logic/daySummary';

interface Props {
  group: MealGroup;
  date: string;
}

export function MealSection({ group, date }: Props) {
  const { t } = useTranslation();
  const mealName = t(`meals.${group.mealType}`);
  const add = () => router.push({ pathname: '/food/add', params: { date, meal: group.mealType } });

  return (
    <View className="gap-1">
      <View className="flex-row items-center gap-2">
        <Text variant="heading" className="flex-1">
          {mealName}
        </Text>
        {group.total.kcal > 0 ? (
          <Text variant="label" className="text-muted">
            {formatNumber(group.total.kcal)} {t('common.kcal')}
          </Text>
        ) : null}
        <IconButton icon="plus" label={t('nutrition.addTo', { meal: mealName })} onPress={add} />
      </View>
      <View className="overflow-hidden rounded-card border border-hairline bg-surface">
        {group.entries.length === 0 ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t('nutrition.addTo', { meal: mealName })}
            onPress={add}
            className="min-h-14 justify-center px-4 active:bg-line"
          >
            <Text variant="caption">{t('nutrition.emptyMeal')}</Text>
          </Pressable>
        ) : (
          group.entries.map((e, i) => (
            <Pressable
              key={e.id}
              accessibilityRole="button"
              onPress={() =>
                router.push({
                  pathname: '/food/[id]',
                  params: {
                    id: e.recipeId ?? e.foodId ?? 'unknown',
                    date,
                    meal: e.mealType,
                    entryId: e.id,
                  },
                })
              }
              className={`min-h-14 flex-row items-center gap-3 px-4 py-2 active:bg-line ${i > 0 ? 'border-t border-line' : ''}`}
            >
              <View className="flex-1">
                <Text variant="body" numberOfLines={2}>
                  {e.name}
                </Text>
                <Text variant="caption">{t('food.grams', { grams: formatNumber(e.grams) })}</Text>
              </View>
              <Text variant="label">{formatNumber(e.nutrients.kcal)}</Text>
            </Pressable>
          ))
        )}
      </View>
    </View>
  );
}
