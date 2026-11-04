import { ActivityIndicator, Pressable, type PressableProps } from 'react-native';

import { useTheme } from '@/theme/ThemeProvider';

import { Text } from './Text';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger';

interface Props extends Omit<PressableProps, 'children'> {
  label: string;
  variant?: Variant;
  loading?: boolean;
  className?: string;
}

const box: Record<Variant, string> = {
  primary: 'bg-ink',
  secondary: 'border-2 border-ink bg-transparent',
  ghost: 'bg-transparent',
  danger: 'border-2 border-danger bg-transparent',
};

const textColor: Record<Variant, string> = {
  primary: 'text-inverse',
  secondary: 'text-ink',
  ghost: 'text-ink underline',
  danger: 'text-danger',
};

/** Кнопка висотою 56 dp: зручно натискати однією рукою в залі. */
export function Button({
  label,
  variant = 'primary',
  loading = false,
  disabled,
  className = '',
  ...rest
}: Props) {
  const { colors } = useTheme();
  const inactive = disabled || loading;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: !!inactive, busy: loading }}
      disabled={inactive}
      className={`min-h-14 flex-row items-center justify-center rounded-2xl px-6 active:opacity-80 ${box[variant]} ${inactive ? 'opacity-50' : ''} ${className}`}
      {...rest}
    >
      {loading ? (
        <ActivityIndicator color={variant === 'primary' ? colors.inverse : colors.ink} />
      ) : (
        <Text variant="label" className={`text-base ${textColor[variant]}`}>
          {label}
        </Text>
      )}
    </Pressable>
  );
}
