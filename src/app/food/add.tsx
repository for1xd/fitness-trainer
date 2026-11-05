import { router, useLocalSearchParams } from 'expo-router';
import { useDeferredValue, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, View } from 'react-native';

import { saveRemoteFood } from '@/features/nutrition/api/saveRemote';
import { FoodRow } from '@/features/nutrition/components/FoodRow';
import {
  isRemoteSearchAvailable,
  REMOTE_MIN_QUERY,
  useRemoteFoodSearch,
  type RemoteFood,
} from '@/features/nutrition/api/remoteSearch';
import { useCatalog, useRecentFoods } from '@/features/nutrition/hooks';
import { defaultMealType } from '@/features/nutrition/logic/daySummary';
import { searchFoods } from '@/features/nutrition/logic/search';
import { useNutrition } from '@/features/nutrition/store';
import type { Food, MealType } from '@/features/nutrition/types';
import { todayIso } from '@/lib/dates';
import { useTheme } from '@/theme/ThemeProvider';
import { Button, Header, Screen, Text, TextField } from '@/ui';

export default function AddFoodScreen() {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const params = useLocalSearchParams<{ date?: string; meal?: MealType; tab?: string }>();
  const date = params.date ?? todayIso();
  const meal = params.meal ?? defaultMealType(new Date().getHours());

  const [query, setQuery] = useState('');
  const deferred = useDeferredValue(query);
  const catalog = useCatalog();
  const recent = useRecentFoods();
  const recipes = useNutrition((s) => s.recipes);
  const recipeIds = useMemo(() => new Set(recipes.map((r) => r.id)), [recipes]);

  const local = useMemo(() => searchFoods(catalog, deferred), [catalog, deferred]);
  const remote = useRemoteFoodSearch(deferred);

  const open = (food: Food) =>
    router.push({ pathname: '/food/[id]', params: { id: food.id, date, meal } });

  const openRemote = (r: RemoteFood) => open(saveRemoteFood(r, t('recipe.serving')));

  const hasQuery = deferred.trim().length > 0;
  const remoteFoods = remote.data ?? [];

  return (
    <Screen edges={['top', 'bottom']}>
      <Header title={t('food.searchTitle')} />
      <Text variant="caption" className="-mt-4">
        {t(`meals.${meal}`)}
      </Text>

      <TextField
        label={t('food.searchLabel')}
        hideLabel
        icon="magnify"
        placeholder={t('food.searchPlaceholder')}
        value={query}
        onChangeText={setQuery}
        autoFocus={params.tab !== 'recipes'}
        autoCorrect={false}
        returnKeyType="search"
      />

      {!hasQuery ? (
        <>
          <View className="flex-row gap-3">
            <Button
              label={t('foodQuick.photo')}
              variant="secondary"
              compact
              className="flex-1"
              onPress={() => router.push({ pathname: '/food/photo', params: { date, meal } })}
            />
            <Button
              label={t('foodQuick.barcode')}
              variant="secondary"
              compact
              className="flex-1"
              onPress={() => router.push({ pathname: '/food/barcode', params: { date, meal } })}
            />
          </View>
          {recent.length > 0 && params.tab !== 'recipes' ? (
            <Section title={t('food.recent')}>
              {recent.map((f, i) => (
                <FoodRow
                  key={f.id}
                  {...f}
                  isRecipe={recipeIds.has(f.id)}
                  first={i === 0}
                  onPress={() => open(f)}
                />
              ))}
            </Section>
          ) : null}

          <Section title={t('food.myRecipes')}>
            {recipes.length === 0 ? (
              <View className="gap-1 px-4 py-4">
                <Text variant="label">{t('recipe.emptyTitle')}</Text>
                <Text variant="caption">{t('recipe.emptyBody')}</Text>
              </View>
            ) : (
              recipes.map((r, i) => {
                const food = catalog.find((f) => f.id === r.id);
                return food ? (
                  <FoodRow
                    key={r.id}
                    {...food}
                    isRecipe
                    first={i === 0}
                    onPress={() => open(food)}
                  />
                ) : null;
              })
            )}
          </Section>

          <View className="gap-3">
            <Button
              label={t('food.createRecipe')}
              variant="secondary"
              onPress={() => router.push('/recipe/edit')}
            />
            <Button
              label={t('food.createFood')}
              variant="secondary"
              onPress={() => router.push({ pathname: '/food/new', params: { date, meal } })}
            />
          </View>
        </>
      ) : (
        <>
          {local.length > 0 ? (
            <Section title={t('food.local')}>
              {local.map((f, i) => (
                <FoodRow
                  key={f.id}
                  {...f}
                  isRecipe={recipeIds.has(f.id)}
                  first={i === 0}
                  onPress={() => open(f)}
                />
              ))}
            </Section>
          ) : null}

          {isRemoteSearchAvailable && deferred.trim().length >= REMOTE_MIN_QUERY ? (
            <Section title={t('food.remote')}>
              {remote.isLoading ? (
                <View className="min-h-14 flex-row items-center gap-3 px-4">
                  <ActivityIndicator color={colors.muted} />
                  <Text variant="caption">{t('food.remoteLoading')}</Text>
                </View>
              ) : remote.isError ? (
                <Text variant="caption" className="px-4 py-4">
                  {t('food.remoteError')}
                </Text>
              ) : (
                remoteFoods.map((r, i) => (
                  <FoodRow
                    key={`${r.source}:${r.externalId}`}
                    name={r.name}
                    brand={r.brand}
                    source={r.source}
                    per100={r.per100}
                    first={i === 0}
                    onPress={() => openRemote(r)}
                  />
                ))
              )}
            </Section>
          ) : !isRemoteSearchAvailable && local.length < 5 ? (
            <Text variant="caption">{t('food.remoteOffline')}</Text>
          ) : null}

          {local.length === 0 && !remote.isLoading && remoteFoods.length === 0 ? (
            <View className="gap-2">
              <Text variant="heading">{t('food.noResults', { query: deferred.trim() })}</Text>
              <Text variant="body" className="text-muted">
                {t('food.noResultsHint')}
              </Text>
            </View>
          ) : null}

          <Button
            label={t('food.createFoodNamed', { name: deferred.trim() })}
            variant="secondary"
            onPress={() =>
              router.push({ pathname: '/food/new', params: { date, meal, name: deferred.trim() } })
            }
          />
        </>
      )}
    </Screen>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View className="gap-2">
      <Text variant="label" className="text-muted">
        {title}
      </Text>
      <View className="overflow-hidden rounded-card border border-hairline bg-surface">
        {children}
      </View>
    </View>
  );
}
