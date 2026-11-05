import { ActivityIndicator, Pressable, type PressableProps } from 'react-native';

import { useReducedMotion } from '@/lib/useReducedMotion';
import { useTheme } from '@/theme/ThemeProvider';

import { pressStyle } from './pressFeedback';

import { Text } from './Text';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'inverse';

interface Props extends Omit<PressableProps, 'children'> {
  label: string;
  variant?: Variant;
  loading?: boolean;
  /** Вужчі відступи — для кількох кнопок в один ряд. */
  compact?: boolean;
  className?: string;
}

const box: Record<Variant, string> = {
  primary: 'bg-ink',
  secondary: 'border-2 border-ink bg-transparent',
  ghost: 'bg-transparent',
  danger: 'border-2 border-danger bg-transparent',
  /** Для темних плашок (таймер відпочинку) */
  inverse: 'border-2 border-inverse bg-transparent',
};

const textColor: Record<Variant, string> = {
  primary: 'text-inverse',
  secondary: 'text-ink',
  ghost: 'text-ink underline',
  danger: 'text-danger',
  inverse: 'text-inverse',
};

/** Кнопка висотою 56 dp: зручно натискати однією рукою в залі. */
export function Button({
  label,
  variant = 'primary',
  loading = false,
  compact = false,
  disabled,
  className = '',
  ...rest
}: Props) {
  const { colors } = useTheme();
  const reduced = useReducedMotion();
  const inactive = disabled || loading;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: !!inactive, busy: loading }}
      disabled={inactive}
      style={({ pressed }) => pressStyle(pressed, reduced)}
      className={`min-h-14 flex-row items-center justify-center rounded-2xl ${variant === 'ghost' ? 'px-1' : compact ? 'px-3' : 'px-6'} active:opacity-80 ${box[variant]} ${inactive ? 'opacity-50' : ''} ${className}`}
      {...rest}
    >
      {loading ? (
        <ActivityIndicator color={variant === 'primary' ? colors.inverse : colors.ink} />
      ) : (
        <Text
          variant="label"
          numberOfLines={1}
          className={`text-center text-base ${textColor[variant]}`}
        >
          {label}
        </Text>
      )}
    </Pressable>
  );
}
