import * as ImagePicker from 'expo-image-picker';
import { router, useLocalSearchParams, useNavigation } from 'expo-router';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, Image, View } from 'react-native';

import { useAuth } from '@/features/auth/store';
import {
  analyzeMealPhoto,
  markAnalysisAccepted,
  PhotoError,
  preparePhoto,
  type PhotoErrorKey,
} from '@/features/nutrition/api/photo';
import { seedFoodBySlug } from '@/features/nutrition/data/foods';
import { defaultMealType } from '@/features/nutrition/logic/daySummary';
import {
  confidenceLevel,
  reviewItemNutrients,
  reviewTotal,
  toReviewItems,
  type ReviewItem,
} from '@/features/nutrition/logic/photoReview';
import { useNutrition } from '@/features/nutrition/store';
import { MEAL_TYPES, type MealType } from '@/features/nutrition/types';
import { todayIso } from '@/lib/dates';
import { formatNumber } from '@/lib/format';
import { artifactCanSendImages } from '@/lib/artifactHost';
import { checkPickedImage } from '@/lib/imageCheck';
import { isSupabaseConfigured } from '@/lib/supabase';
import { useTheme } from '@/theme/ThemeProvider';
import {
  Button,
  CompactNumberInput,
  Header,
  IconButton,
  Notice,
  Screen,
  Segmented,
  Text,
  TextField,
} from '@/ui';

type Phase =
  | { kind: 'pick' }
  | { kind: 'analyzing'; uri: string }
  | {
      kind: 'review';
      uri: string;
      analysisId: string | null;
      dishName: string;
      notes: string;
      overall: number;
    }
  | { kind: 'error'; key: PhotoErrorKey; uri?: string };

export default function MealPhotoScreen() {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const params = useLocalSearchParams<{ date?: string; meal?: MealType }>();
  const date = params.date ?? todayIso();
  const session = useAuth((s) => s.session);
  const navigation = useNavigation();
  const [phase, setPhase] = useState<Phase>({ kind: 'pick' });
  const [hint, setHint] = useState('');
  const [items, setItems] = useState<ReviewItem[]>([]);
  const [meal, setMeal] = useState<MealType>(params.meal ?? defaultMealType(new Date().getHours()));

  // В артефакті Claude розпізнавання працює без сервера — через можливість платформи
  const serverReady = isSupabaseConfigured && session !== null;
  const [artifactPhoto, setArtifactPhoto] = useState<boolean | null>(null);
  useEffect(() => {
    let alive = true;
    void artifactCanSendImages().then((ok) => alive && setArtifactPhoto(ok));
    return () => {
      alive = false;
    };
  }, []);

  const blocked: PhotoErrorKey | null =
    !serverReady && artifactPhoto === false ? 'notConfigured' : null;

  const run = async (source: 'camera' | 'library') => {
    try {
      if (source === 'camera') {
        const perm = await ImagePicker.requestCameraPermissionsAsync();
        if (!perm.granted) {
          setPhase({ kind: 'error', key: 'generic' });
          return;
        }
      }
      const options: ImagePicker.ImagePickerOptions = { mediaTypes: ['images'], quality: 1 };
      const picked =
        source === 'camera'
          ? await ImagePicker.launchCameraAsync(options)
          : await ImagePicker.launchImageLibraryAsync(options);
      const asset = picked.canceled ? undefined : picked.assets[0];
      if (!asset) return;
      // Лише зображення розумного розміру; далі фото перекодовується (зменшення, без EXIF)
      const invalid = checkPickedImage(asset);
      if (invalid) {
        setPhase({ kind: 'error', key: invalid });
        return;
      }
      setPhase({ kind: 'analyzing', uri: asset.uri });
      const photo = await preparePhoto(asset.uri, asset.width, asset.height);
      const result = await analyzeMealPhoto(photo.base64, hint);
      setItems(toReviewItems(result.analysis.items, seedFoodBySlug));
      setPhase({
        kind: 'review',
        uri: photo.uri,
        analysisId: result.analysisId,
        dishName: result.analysis.dishName,
        notes: result.analysis.notes,
        overall: result.analysis.overallConfidence,
      });
    } catch (e) {
      setPhase({ kind: 'error', key: e instanceof PhotoError ? e.key : 'generic' });
    }
  };

  const save = () => {
    if (phase.kind !== 'review') return;
    const { addEntry } = useNutrition.getState();
    for (const item of items) {
      if (item.grams <= 0) continue;
      addEntry({
        food: item.food ?? {
          id: item.key,
          source: 'ai',
          name: item.name,
          per100: item.per100,
          portions: [],
        },
        detached: !item.food,
        grams: item.grams,
        mealType: meal,
        date,
        source: 'photo',
        photoAnalysisId: phase.analysisId ?? undefined,
      });
    }
    void markAnalysisAccepted(phase.analysisId);
    const parent = navigation.getParent();
    if (parent?.canGoBack()) parent.goBack();
    else router.replace('/nutrition');
  };

  if (blocked) {
    return (
      <Screen edges={['top', 'bottom']}>
        <Header title={t('photo.title')} />
        <Notice text={t(`photo.errors.${blocked}`)} />
        <Button
          label={t('photo.addMore')}
          variant="secondary"
          onPress={() => router.replace({ pathname: '/food/add', params: { date, meal } })}
        />
      </Screen>
    );
  }

  if (phase.kind === 'analyzing') {
    return (
      <Screen edges={['top', 'bottom']}>
        <Header title={t('photo.title')} />
        <Image
          source={{ uri: phase.uri }}
          className="aspect-square w-full rounded-3xl"
          resizeMode="cover"
        />
        <View className="flex-row items-center gap-3" accessibilityLiveRegion="polite">
          <ActivityIndicator color={colors.ink} />
          <View className="flex-1">
            <Text variant="heading">{t('photo.analyzing')}</Text>
            <Text variant="caption">{t('photo.analyzingHint')}</Text>
          </View>
        </View>
      </Screen>
    );
  }

  if (phase.kind === 'review') {
    const total = reviewTotal(items);
    return (
      <Screen
        edges={['top', 'bottom']}
        footer={
          <>
            <Button label={t('photo.save')} onPress={save} disabled={!items.length} />
            <Button
              label={t('photo.retake')}
              variant="secondary"
              onPress={() => setPhase({ kind: 'pick' })}
            />
          </>
        }
      >
        <Header title={t('photo.review')} />
        <View className="flex-row gap-4">
          <Image source={{ uri: phase.uri }} className="h-24 w-24 rounded-2xl" resizeMode="cover" />
          <View className="flex-1 justify-center gap-1">
            <Text variant="heading">{phase.dishName}</Text>
            <Text variant="number">{t('photo.total', { kcal: formatNumber(total.kcal) })}</Text>
          </View>
        </View>
        {phase.overall < 0.5 ? <Notice tone="warn" text={t('photo.lowConfidence')} /> : null}
        {phase.notes ? <Text variant="caption">{phase.notes}</Text> : null}

        {items.length ? (
          <View className="overflow-hidden rounded-card border border-hairline bg-surface">
            {items.map((item, i) => {
              const n = reviewItemNutrients(item);
              const level = confidenceLevel(item.confidence);
              return (
                <View
                  key={item.key}
                  className={`gap-2 px-4 py-3 ${i ? 'border-t border-line' : ''}`}
                >
                  <View className="flex-row items-start gap-2">
                    <View className="flex-1">
                      <Text variant="label">{item.name}</Text>
                      <Text variant="caption">
                        {t(`photo.confidence.${level}`)}
                        {item.food ? `, ${t('photo.fromDb')}` : ''}
                      </Text>
                    </View>
                    <IconButton
                      icon="close"
                      label={t('photo.remove', { name: item.name })}
                      onPress={() => setItems((list) => list.filter((x) => x.key !== item.key))}
                    />
                  </View>
                  <View className="flex-row items-center gap-3">
                    <CompactNumberInput
                      label={t('photo.itemGrams', { name: item.name })}
                      value={item.grams}
                      onChange={(g) =>
                        setItems((list) =>
                          list.map((x) => (x.key === item.key ? { ...x, grams: g ?? 0 } : x)),
                        )
                      }
                      suffix={t('common.g')}
                      width={110}
                    />
                    <Text variant="body" className="flex-1 text-right">
                      {formatNumber(n.kcal)} {t('common.kcal')}
                    </Text>
                  </View>
                  <Text variant="caption">
                    {t('result.protein')} {formatNumber(n.proteinG, 1)},{' '}
                    {t('result.fat').toLowerCase()} {formatNumber(n.fatG, 1)},{' '}
                    {t('result.carbs').toLowerCase()} {formatNumber(n.carbsG, 1)} {t('common.g')}
                  </Text>
                </View>
              );
            })}
          </View>
        ) : (
          <Text variant="body" className="text-muted">
            {t('photo.empty')}
          </Text>
        )}

        <Segmented
          label={t('food.meal')}
          value={meal}
          onChange={setMeal}
          options={MEAL_TYPES.map((m) => ({ value: m, label: t(`meals.${m}`) }))}
        />
        <Text variant="caption">{t('food.approx')}</Text>
      </Screen>
    );
  }

  return (
    <Screen edges={['top', 'bottom']}>
      <Header title={t('photo.title')} />
      <Text variant="body" className="-mt-2 text-muted">
        {t('photo.intro')}
      </Text>
      {artifactPhoto ? <Notice text={t('photo.artifactNote')} /> : null}
      {phase.kind === 'error' ? <Notice tone="warn" text={t(`photo.errors.${phase.key}`)} /> : null}
      <TextField
        label={t('photo.hint')}
        placeholder={t('photo.hintPlaceholder')}
        value={hint}
        onChangeText={setHint}
        maxLength={200}
      />
      <Button label={t('photo.take')} onPress={() => void run('camera')} />
      <Button label={t('photo.pick')} variant="secondary" onPress={() => void run('library')} />
      <Button
        label={t('photo.addMore')}
        variant="ghost"
        onPress={() => router.replace({ pathname: '/food/add', params: { date, meal } })}
        className="self-start"
      />
    </Screen>
  );
}
