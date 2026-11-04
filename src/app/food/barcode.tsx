import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, View } from 'react-native';

import { lookupBarcode } from '@/features/nutrition/api/barcode';
import { saveRemoteFood } from '@/features/nutrition/api/saveRemote';
import { BarcodeCamera } from '@/features/nutrition/components/BarcodeCamera';
import { isValidBarcode, normalizeBarcode } from '@/features/nutrition/logic/barcode';
import type { MealType } from '@/features/nutrition/types';
import { todayIso } from '@/lib/dates';
import { useTheme } from '@/theme/ThemeProvider';
import { Button, Header, Notice, Screen, Text, TextField } from '@/ui';

type State =
  | { kind: 'idle' }
  | { kind: 'searching' }
  | { kind: 'invalid' }
  | { kind: 'notFound'; code: string }
  | { kind: 'error' };

export default function BarcodeScreen() {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const params = useLocalSearchParams<{ date?: string; meal?: MealType }>();
  const date = params.date ?? todayIso();
  const [manual, setManual] = useState('');
  const [state, setState] = useState<State>({ kind: 'idle' });

  const find = async (raw: string) => {
    const code = normalizeBarcode(raw);
    if (!isValidBarcode(code)) {
      setState({ kind: 'invalid' });
      return;
    }
    setState({ kind: 'searching' });
    try {
      const result = await lookupBarcode(code);
      if (result.kind === 'notFound') {
        setState({ kind: 'notFound', code });
        return;
      }
      const food =
        result.kind === 'local' ? result.food : saveRemoteFood(result.food, t('recipe.serving'));
      setState({ kind: 'idle' });
      router.replace({
        pathname: '/food/[id]',
        params: { id: food.id, date, meal: params.meal, source: 'barcode' },
      });
    } catch {
      setState({ kind: 'error' });
    }
  };

  return (
    <Screen edges={['top', 'bottom']}>
      <Header title={t('barcode.title')} />
      <Text variant="body" className="-mt-2 text-muted">
        {t('barcode.intro')}
      </Text>

      <BarcodeCamera onScanned={(code) => void find(code)} paused={state.kind === 'searching'} />

      <TextField
        label={t('barcode.manual')}
        placeholder={t('barcode.manualPlaceholder')}
        value={manual}
        onChangeText={(v) => {
          setManual(v);
          if (state.kind !== 'searching') setState({ kind: 'idle' });
        }}
        keyboardType="number-pad"
        inputMode="numeric"
        maxLength={18}
        onSubmitEditing={() => void find(manual)}
      />
      <Button
        label={t('barcode.find')}
        onPress={() => void find(manual)}
        disabled={normalizeBarcode(manual).length < 8 || state.kind === 'searching'}
      />

      {state.kind === 'searching' ? (
        <View className="flex-row items-center gap-3" accessibilityLiveRegion="polite">
          <ActivityIndicator color={colors.ink} />
          <Text variant="body">{t('barcode.searching')}</Text>
        </View>
      ) : null}
      {state.kind === 'invalid' ? <Notice tone="warn" text={t('barcode.invalid')} /> : null}
      {state.kind === 'error' ? <Notice tone="warn" text={t('barcode.error')} /> : null}
      {state.kind === 'notFound' ? (
        <View className="gap-3">
          <Notice
            text={`${t('barcode.notFound', { code: state.code })} ${t('barcode.notFoundHint')}`}
          />
          <Button
            label={t('barcode.addOwn')}
            variant="secondary"
            onPress={() =>
              router.replace({
                pathname: '/food/new',
                params: { date, meal: params.meal, barcode: state.code },
              })
            }
          />
        </View>
      ) : null}
    </Screen>
  );
}
