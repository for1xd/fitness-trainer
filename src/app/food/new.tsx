import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';

import { useNutrition } from '@/features/nutrition/store';
import type { MealType } from '@/features/nutrition/types';
import { formatNumber } from '@/lib/format';
import { Button, Header, Notice, NumberField, Screen, Text, TextField } from '@/ui';

type Macro = 'kcal' | 'proteinG' | 'fatG' | 'carbsG';

export default function NewFoodScreen() {
  const { t } = useTranslation();
  const params = useLocalSearchParams<{ date?: string; meal?: MealType; name?: string }>();
  const saveFood = useNutrition((s) => s.saveFood);
  const [name, setName] = useState(params.name ?? '');
  const [brand, setBrand] = useState('');
  const [values, setValues] = useState<Partial<Record<Macro, number>>>({});

  const { kcal, proteinG, fatG, carbsG } = values;
  const complete =
    name.trim().length > 1 &&
    kcal !== undefined &&
    proteinG !== undefined &&
    fatG !== undefined &&
    carbsG !== undefined;

  // Підказка, якщо калорії з етикетки не сходяться з БЖВ більш ніж на 20 %
  const fromMacros =
    proteinG !== undefined && fatG !== undefined && carbsG !== undefined
      ? proteinG * 4 + fatG * 9 + carbsG * 4
      : undefined;
  const mismatch =
    kcal !== undefined &&
    fromMacros !== undefined &&
    kcal > 20 &&
    Math.abs(fromMacros - kcal) / kcal > 0.2;

  const save = () => {
    if (!complete) return;
    const food = saveFood({
      source: 'user',
      name: name.trim(),
      brand: brand.trim() || undefined,
      per100: { kcal, proteinG, fatG, carbsG },
      portions: [],
    });
    router.replace({
      pathname: '/food/[id]',
      params: { id: food.id, date: params.date, meal: params.meal },
    });
  };

  const field = (key: Macro, label: string, unit: string, max: number) => (
    <NumberField
      key={key}
      label={label}
      unit={unit}
      value={values[key]}
      onChange={(v) => setValues((s) => ({ ...s, [key]: v }))}
      min={0}
      max={max}
      step={key === 'kcal' ? 1 : 0.5}
      fallback={0}
    />
  );

  return (
    <Screen
      edges={['top', 'bottom']}
      footer={<Button label={t('food.saveFood')} onPress={save} disabled={!complete} />}
    >
      <Header title={t('food.newTitle')} />
      <Text variant="body" className="-mt-2 text-muted">
        {t('food.newHint')}
      </Text>
      <TextField
        label={t('food.name')}
        value={name}
        onChangeText={setName}
        autoFocus={!params.name}
      />
      <TextField label={t('food.brand')} value={brand} onChangeText={setBrand} />
      <View className="gap-5">
        {field('kcal', t('food.kcal'), t('common.kcal'), 950)}
        {field('proteinG', t('result.protein'), t('common.g'), 100)}
        {field('fatG', t('result.fat'), t('common.g'), 100)}
        {field('carbsG', t('result.carbs'), t('common.g'), 100)}
      </View>
      {mismatch && fromMacros !== undefined ? (
        <Notice tone="warn" text={t('food.macrosMismatch', { kcal: formatNumber(fromMacros) })} />
      ) : null}
    </Screen>
  );
}
