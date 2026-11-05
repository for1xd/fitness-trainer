import { Icon } from '@/ui/icons/Icon';
import type { ComponentProps } from 'react';
import { Pressable } from 'react-native';

import { useReducedMotion } from '@/lib/useReducedMotion';
import { useTheme } from '@/theme/ThemeProvider';

import { pressStyle } from './pressFeedback';

interface Props {
  icon: ComponentProps<typeof Icon>['name'];
  /** Обов'язковий підпис для екранних читачів і підказки. */
  label: string;
  onPress: () => void;
  disabled?: boolean;
  tone?: 'default' | 'filled' | 'danger';
}

/** Квадратна кнопка з іконкою 48×48. */
export function IconButton({ icon, label, onPress, disabled, tone = 'default' }: Props) {
  const { colors } = useTheme();
  const reduced = useReducedMotion();
  const color = tone === 'filled' ? colors.inverse : tone === 'danger' ? colors.danger : colors.ink;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: !!disabled }}
      // На вебі показує нативну підказку
      {...({ title: label } as object)}
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => pressStyle(pressed, reduced)}
      hitSlop={4}
      className={`h-12 w-12 items-center justify-center rounded-xl ${
        tone === 'filled' ? 'bg-ink active:opacity-80' : 'active:bg-line'
      } ${disabled ? 'opacity-30' : ''}`}
    >
      <Icon name={icon} size={24} color={color} />
    </Pressable>
  );
}
