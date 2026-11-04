import { router, useLocalSearchParams, useNavigation } from 'expo-router';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';

import { useFoodById } from '@/features/nutrition/hooks';
import { defaultMealType } from '@/features/nutrition/logic/daySummary';
import { per100FromTotal, scaleNutrients } from '@/features/nutrition/logic/nutrients';
import { useNutrition } from '@/features/nutrition/store';
import { MEAL_TYPES, type MealType } from '@/features/nutrition/types';
import { confirmAction } from '@/lib/confirm';
import { todayIso } from '@/lib/dates';
import { formatNumber } from '@/lib/format';
import { Button, EmptyState, Header, NumberField, Screen, Segmented, Text } from '@/ui';

const GRAMS = 'g';
const DOT = { protein: 'bg-protein', fat: 'bg-fat', carbs: 'bg-carbs' } as const;

export default function FoodPortionScreen() {
  const { t } = useTranslation();
  const params = useLocalSearchParams<{
    id: string;
    date?: string;
    meal?: MealType;
    entryId?: string;
    source?: 'barcode';
  }>();
  const found = useFoodById(params.id);
  const entry = useNutrition((s) => s.entries.find((e) => e.id === params.entryId));
  // Продукту може не бути локально (видалено або ще не синхронізовано) — тоді беремо знімок із запису.
  const food = useMemo(
    () =>
      found.food ??
      (entry
        ? {
            id: entry.foodId ?? entry.recipeId ?? entry.id,
            source: 'user' as const,
            name: entry.name,
            per100: per100FromTotal(entry.nutrients, entry.grams),
            portions: [],
          }
        : undefined),
    [found.food, entry],
  );
  const isRecipe = found.isRecipe;
  const { addEntry, updateEntry, deleteEntry } = useNutrition.getState();
  const navigation = useNavigation();
  // Закриває весь стек «їжа» і повертає на екран, з якого почали (Сьогодні чи Харчування).
  const close = () => {
    const parent = navigation.getParent();
    if (parent?.canGoBack()) parent.goBack();
    else router.replace('/nutrition');
  };

  const date = entry?.date ?? params.date ?? todayIso();
  const defaultPortion = food?.portions[0];

  // Редагування — з грамів запису; новий — з першої типової порції.
  const [unit, setUnit] = useState<string>(entry || !defaultPortion ? GRAMS : defaultPortion.id);
  const [qty, setQty] = useState<number | undefined>(
    entry ? entry.grams : defaultPortion ? 1 : 100,
  );
  const [meal, setMeal] = useState<MealType>(
    entry?.mealType ?? params.meal ?? defaultMealType(new Date().getHours()),
  );

  const unitGrams = unit === GRAMS ? 1 : (food?.portions.find((p) => p.id === unit)?.grams ?? 1);
  const grams = qty === undefined ? undefined : Math.round(qty * unitGrams);
  const preview = useMemo(
    () => (food && grams ? scaleNutrients(food.per100, grams) : undefined),
    [food, grams],
  );

  if (!food) {
    return (
      <Screen edges={['top', 'bottom']}>
        <Header title="" />
        <EmptyState
          icon="food-off-outline"
          title={t('food.notFound')}
          body={t('food.notFoundBody')}
          actionLabel={t('food.backToSearch')}
          onAction={() => router.replace({ pathname: '/food/add', params: { date, meal } })}
        />
      </Screen>
    );
  }

  const changeUnit = (next: string) => {
    // Переводимо поточну кількість у нову одиницю, щоб вага не стрибала.
    const nextGrams = next === GRAMS ? 1 : (food.portions.find((p) => p.id === next)?.grams ?? 1);
    if (grams)
      setQty(next === GRAMS ? grams : Math.max(0.25, Math.round((grams / nextGrams) * 4) / 4));
    setUnit(next);
  };

  const save = () => {
    if (!grams) return;
    if (entry) updateEntry(entry.id, { grams, mealType: meal, food });
    else
      addEntry({
        food,
        isRecipe,
        grams,
        mealType: meal,
        date,
        source: params.source === 'barcode' ? 'barcode' : 'manual',
      });
    close();
  };

  const remove = async () => {
    if (!entry) return;
    const ok = await confirmAction({
      title: t('food.deleteTitle', { name: entry.name }),
      message: t('food.deleteBody'),
      confirmLabel: t('food.deleteEntry'),
      cancelLabel: t('common.cancel'),
      destructive: true,
    });
    if (!ok) return;
    deleteEntry(entry.id);
    close();
  };

  const portionLabel = food.portions.find((p) => p.id === unit)?.label ?? '';

  const unitOptions = [
    { value: GRAMS, label: t('food.unitGrams') },
    ...food.portions.slice(0, 3).map((p) => ({ value: p.id, label: p.label })),
  ];

  return (
    <Screen
      edges={['top', 'bottom']}
      footer={
        <>
          <Button
            label={t(entry ? 'food.saveChanges' : 'food.add')}
            onPress={save}
            disabled={!grams}
          />
          {entry ? (
            <Button label={t('food.deleteEntry')} variant="danger" onPress={() => void remove()} />
          ) : null}
        </>
      }
    >
      <Header title={entry?.name ?? food.name} />

      <View>
        <Text variant="hero">{preview ? formatNumber(preview.kcal) : '—'}</Text>
        <Text variant="caption">
          {t('common.kcal')}
          {grams ? `, ${t('food.grams', { grams: formatNumber(grams) })}` : ''}
        </Text>
      </View>

      <View className="flex-row rounded-2xl bg-surface p-4">
        {(['protein', 'fat', 'carbs'] as const).map((k) => {
          const value = preview ? preview[`${k}G`] : 0;
          return (
            <View key={k} className="flex-1 gap-0.5">
              <View className="flex-row items-center gap-1.5">
                <View className={`h-2.5 w-2.5 rounded-full ${DOT[k]}`} />
                <Text variant="caption">{t(`result.${k}`)}</Text>
              </View>
              <Text variant="number" className="text-xl">
                {formatNumber(value, 1)}
                <Text variant="caption"> {t('common.g')}</Text>
              </Text>
            </View>
          );
        })}
      </View>

      {food.portions.length > 0 ? (
        <Segmented
          label={t('food.amount')}
          value={unit}
          onChange={changeUnit}
          options={unitOptions}
        />
      ) : null}

      <NumberField
        label={
          unit === GRAMS
            ? t('food.unitGrams')
            : t('food.portionCount', { label: portionLabel, grams: formatNumber(unitGrams) })
        }
        unit={unit === GRAMS ? t('common.g') : portionLabel}
        value={qty}
        onChange={setQty}
        min={unit === GRAMS ? 1 : 0.25}
        max={unit === GRAMS ? 3000 : 30}
        step={unit === GRAMS ? 10 : 0.5}
        fallback={unit === GRAMS ? 100 : 1}
      />

      <Segmented
        label={t('food.meal')}
        value={meal}
        onChange={setMeal}
        options={MEAL_TYPES.map((m) => ({ value: m, label: t(`meals.${m}`) }))}
      />

      {isRecipe ? (
        <Button
          label={t('recipe.edit')}
          variant="secondary"
          onPress={() => router.push({ pathname: '/recipe/edit', params: { id: food.id } })}
        />
      ) : null}

      <Text variant="caption">
        {t('food.per100', { kcal: formatNumber(food.per100.kcal) })}
        {food.source === 'ua_dish' ? `. ${t('food.approx')}` : ''}
      </Text>
    </Screen>
  );
}
