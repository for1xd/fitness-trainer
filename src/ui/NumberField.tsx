import { useId, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Platform, Pressable, TextInput, View } from 'react-native';

import { useTheme } from '@/theme/ThemeProvider';

import { Text } from './Text';

interface Props {
  label: string;
  unit: string;
  value: number | undefined;
  onChange: (value: number | undefined) => void;
  min: number;
  max: number;
  step: number;
  /** Значення для першого натискання ±, коли поле порожнє. */
  fallback: number;
  hint?: string;
}

/** На вебі прибираємо контур браузера: фокус показує рамка контейнера. */
const NO_OUTLINE = Platform.OS === 'web' ? ({ outlineStyle: 'none' } as object) : undefined;

const decimals = (step: number) => (Number.isInteger(step) ? 0 : 1);
const toText = (v: number | undefined, step: number) =>
  v === undefined ? '' : v.toFixed(decimals(step)).replace('.', ',');

/**
 * Числове поле з великими кнопками −/+ (56 dp).
 * Помилка показується після виходу з поля і зникає, щойно значення стає коректним.
 */
export function NumberField({
  label,
  unit,
  value,
  onChange,
  min,
  max,
  step,
  fallback,
  hint,
}: Props) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const id = useId();
  const [text, setText] = useState(toText(value, step));
  const [touched, setTouched] = useState(false);
  const [focused, setFocused] = useState(false);

  // Якщо значення змінили кнопками ±, оновлюємо текст (без ефекту — під час рендеру).
  const [syncedValue, setSyncedValue] = useState(value);
  if (value !== syncedValue) {
    setSyncedValue(value);
    if (value !== Number(text.replace(',', '.'))) setText(toText(value, step));
  }

  const parsed = text.trim() === '' ? undefined : Number(text.replace(',', '.'));
  const invalid = parsed === undefined || Number.isNaN(parsed) || parsed < min || parsed > max;
  const error = touched && invalid ? t('validation.range', { min, max, unit }) : undefined;

  const handleText = (next: string) => {
    const clean = next.replace(/[^0-9.,]/g, '');
    setText(clean);
    const n = Number(clean.replace(',', '.'));
    onChange(clean === '' || Number.isNaN(n) || n < min || n > max ? undefined : n);
  };

  const bump = (dir: 1 | -1) => {
    const base = value ?? fallback;
    const next = Math.min(max, Math.max(min, Math.round((base + dir * step) / step) * step));
    setTouched(true);
    onChange(Number(next.toFixed(decimals(step))));
  };

  return (
    <View className="gap-2">
      <Text variant="label" nativeID={id}>
        {label}
      </Text>
      <View className="flex-row items-stretch gap-2">
        <StepButton symbol="−" label={t('common.decrease')} onPress={() => bump(-1)} />
        <View
          className={`h-14 flex-1 flex-row items-center justify-center rounded-2xl border-2 bg-raised px-3 ${
            error ? 'border-danger' : focused ? 'border-ink' : 'border-line'
          }`}
        >
          <TextInput
            accessibilityLabelledBy={id}
            accessibilityLabel={label}
            value={text}
            onChangeText={handleText}
            onFocus={() => setFocused(true)}
            onBlur={() => {
              setFocused(false);
              setTouched(true);
            }}
            style={NO_OUTLINE}
            keyboardType={decimals(step) ? 'decimal-pad' : 'number-pad'}
            inputMode={decimals(step) ? 'decimal' : 'numeric'}
            placeholder={toText(fallback, step)}
            placeholderTextColor={colors.muted}
            selectTextOnFocus
            maxLength={6}
            className="min-w-16 text-center font-display text-2xl text-ink"
          />
          <Text variant="caption" className="ml-1">
            {unit}
          </Text>
        </View>
        <StepButton symbol="+" label={t('common.increase')} onPress={() => bump(1)} />
      </View>
      {error ? (
        <Text variant="caption" className="text-danger" accessibilityLiveRegion="polite">
          {error}
        </Text>
      ) : hint ? (
        <Text variant="caption">{hint}</Text>
      ) : null}
    </View>
  );
}

function StepButton({
  symbol,
  label,
  onPress,
}: {
  symbol: string;
  label: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      className="h-14 w-14 items-center justify-center rounded-2xl bg-surface active:bg-line"
    >
      <Text variant="number">{symbol}</Text>
    </Pressable>
  );
}
