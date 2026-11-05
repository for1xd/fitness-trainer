import { randomUUID } from 'expo-crypto';
import { router, useLocalSearchParams } from 'expo-router';
import { useDeferredValue, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Platform, TextInput, View } from 'react-native';

import { FoodRow } from '@/features/nutrition/components/FoodRow';
import { SEED_FOODS } from '@/features/nutrition/data/foods';
import { recipeTotals } from '@/features/nutrition/logic/recipe';
import { searchFoods } from '@/features/nutrition/logic/search';
import { useNutrition } from '@/features/nutrition/store';
import type { Food, Nutrients, RecipeIngredient } from '@/features/nutrition/types';
import { confirmAction } from '@/lib/confirm';
import { formatNumber } from '@/lib/format';
import { useTheme } from '@/theme/ThemeProvider';
import { Button, Header, IconButton, NumberField, Screen, Text, TextField } from '@/ui';

// Фіксована ширина: у браузері поле вводу інакше має власну ширину й розпирає рядок
const GRAMS_INPUT = {
  width: 52,
  minWidth: 0,
  ...(Platform.OS === 'web' ? { outlineStyle: 'none' } : {}),
} as object;

export default function RecipeEditScreen() {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const existing = useNutrition((s) => s.recipes.find((r) => r.id === id));
  const userFoods = useNutrition((s) => s.userFoods);
  const { saveRecipe, deleteRecipe } = useNutrition.getState();

  const [name, setName] = useState(existing?.name ?? '');
  const [ingredients, setIngredients] = useState<RecipeIngredient[]>(existing?.ingredients ?? []);
  const [servings, setServings] = useState<number | undefined>(existing?.servings ?? 1);
  const [cookedWeightG, setCookedWeightG] = useState<number | undefined>(existing?.cookedWeightG);
  const [query, setQuery] = useState('');
  const deferred = useDeferredValue(query);

  // Інгредієнти — з власних і базових продуктів (рецепт у рецепті не підтримуємо)
  const pool = useMemo(() => [...userFoods, ...SEED_FOODS], [userFoods]);
  const results = useMemo(() => searchFoods(pool, deferred, 6), [pool, deferred]);
  const totals = recipeTotals({ ingredients, cookedWeightG, servings: servings ?? 1 });

  const addIngredient = (food: Food) => {
    setIngredients((list) => [
      ...list,
      {
        id: randomUUID(),
        foodId: food.id,
        name: food.name,
        grams: food.portions[0]?.grams ?? 100,
        per100: food.per100,
      },
    ]);
    setQuery('');
  };

  const setGrams = (ingredientId: string, grams: number) =>
    setIngredients((list) => list.map((i) => (i.id === ingredientId ? { ...i, grams } : i)));

  const canSave =
    name.trim().length > 1 && ingredients.length > 0 && ingredients.every((i) => i.grams > 0);

  const save = () => {
    if (!canSave) return;
    saveRecipe({
      id: existing?.id,
      name: name.trim(),
      ingredients,
      cookedWeightG,
      servings: servings ?? 1,
    });
    router.back();
  };

  const remove = async () => {
    if (!existing) return;
    const ok = await confirmAction({
      title: t('recipe.deleteTitle', { name: existing.name }),
      message: t('recipe.deleteBody'),
      confirmLabel: t('recipe.delete'),
      cancelLabel: t('common.cancel'),
      destructive: true,
    });
    if (!ok) return;
    deleteRecipe(existing.id);
    router.back();
  };

  return (
    <Screen
      edges={['top', 'bottom']}
      footer={
        <>
          <Button label={t('recipe.save')} onPress={save} disabled={!canSave} />
          {existing ? (
            <Button label={t('recipe.delete')} variant="danger" onPress={() => void remove()} />
          ) : null}
        </>
      }
    >
      <Header title={t(existing ? 'recipe.editTitle' : 'recipe.newTitle')} />

      <TextField
        label={t('recipe.name')}
        placeholder={t('recipe.namePlaceholder')}
        value={name}
        onChangeText={setName}
      />

      <View className="gap-2">
        <Text variant="heading">{t('recipe.ingredients')}</Text>
        {ingredients.length === 0 ? (
          <Text variant="caption">{t('recipe.noIngredients')}</Text>
        ) : (
          <View className="overflow-hidden rounded-card border border-hairline bg-surface">
            {ingredients.map((i, idx) => (
              <View
                key={i.id}
                className={`min-h-16 flex-row items-center gap-2 py-2 pl-4 pr-1 ${idx > 0 ? 'border-t border-line' : ''}`}
              >
                <View className="flex-1">
                  <Text variant="body" numberOfLines={2}>
                    {i.name}
                  </Text>
                  <Text variant="caption">
                    {formatNumber((i.per100.kcal * i.grams) / 100)} {t('common.kcal')}
                  </Text>
                </View>
                <View className="h-12 w-24 flex-row items-center justify-end overflow-hidden rounded-xl border-2 border-line bg-raised px-2">
                  <TextInput
                    accessibilityLabel={`${i.name}, ${t('common.g')}`}
                    value={String(i.grams)}
                    onChangeText={(v) => setGrams(i.id, Number(v.replace(/[^0-9]/g, '')) || 0)}
                    keyboardType="number-pad"
                    inputMode="numeric"
                    maxLength={5}
                    selectTextOnFocus
                    placeholderTextColor={colors.muted}
                    className="h-full text-right font-body-semibold text-base text-ink"
                    style={GRAMS_INPUT}
                  />
                  <Text variant="caption"> {t('common.g')}</Text>
                </View>
                <IconButton
                  icon="close"
                  label={t('recipe.remove', { name: i.name })}
                  onPress={() => setIngredients((list) => list.filter((x) => x.id !== i.id))}
                />
              </View>
            ))}
          </View>
        )}

        <TextField
          label={t('recipe.ingredientSearch')}
          hideLabel
          icon="plus"
          placeholder={t('recipe.ingredientSearch')}
          value={query}
          onChangeText={setQuery}
          autoCorrect={false}
        />
        {deferred.trim() ? (
          <View className="overflow-hidden rounded-card border border-hairline bg-surface">
            {results.map((f, idx) => (
              <FoodRow key={f.id} {...f} first={idx === 0} onPress={() => addIngredient(f)} />
            ))}
          </View>
        ) : null}
      </View>

      <View className="gap-5">
        <NumberField
          label={t('recipe.servings')}
          unit=""
          value={servings}
          onChange={setServings}
          min={1}
          max={30}
          step={1}
          fallback={1}
        />
        <NumberField
          label={t('recipe.cookedWeight')}
          unit={t('common.g')}
          value={cookedWeightG}
          onChange={setCookedWeightG}
          min={10}
          max={20000}
          step={10}
          fallback={Math.max(10, Math.round(totals.rawWeightG / 10) * 10)}
          hint={t('recipe.cookedWeightHint')}
        />
      </View>

      {ingredients.length > 0 ? (
        <View className="gap-3 rounded-card border border-hairline bg-surface p-4">
          <Totals
            title={t('recipe.perServing', { grams: formatNumber(totals.servingG) })}
            n={{
              kcal: (totals.per100.kcal * totals.servingG) / 100,
              proteinG: (totals.per100.proteinG * totals.servingG) / 100,
              fatG: (totals.per100.fatG * totals.servingG) / 100,
              carbsG: (totals.per100.carbsG * totals.servingG) / 100,
            }}
          />
          <Totals
            title={t('recipe.total', { grams: formatNumber(totals.finalWeightG) })}
            n={totals.total}
          />
        </View>
      ) : null}
    </Screen>
  );
}

function Totals({ title, n }: { title: string; n: Nutrients }) {
  const { t } = useTranslation();
  return (
    <View className="gap-1">
      <Text variant="label">{title}</Text>
      <Text variant="body" className="text-muted">
        {formatNumber(n.kcal)} {t('common.kcal')}, {t('result.protein').toLowerCase()}{' '}
        {formatNumber(n.proteinG)} {t('common.g')}, {t('result.fat').toLowerCase()}{' '}
        {formatNumber(n.fatG)} {t('common.g')}, {t('result.carbs').toLowerCase()}{' '}
        {formatNumber(n.carbsG)} {t('common.g')}
      </Text>
    </View>
  );
}
