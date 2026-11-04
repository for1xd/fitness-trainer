import { MaterialCommunityIcons } from '@expo/vector-icons';
import type { ComponentProps } from 'react';
import { useState } from 'react';
import { Platform, TextInput, View, type TextInputProps } from 'react-native';

import { useTheme } from '@/theme/ThemeProvider';

import { Text } from './Text';

interface Props extends TextInputProps {
  label: string;
  /** Сховати підпис візуально (лишається для екранних читачів), напр. для поля пошуку. */
  hideLabel?: boolean;
  hint?: string;
  error?: string;
  icon?: ComponentProps<typeof MaterialCommunityIcons>['name'];
}

/** На вебі прибираємо контур браузера: фокус показує рамка контейнера. */
const NO_OUTLINE = Platform.OS === 'web' ? ({ outlineStyle: 'none' } as object) : undefined;

export function TextField({
  label,
  hideLabel,
  hint,
  error,
  icon,
  onFocus,
  onBlur,
  ...input
}: Props) {
  const { colors } = useTheme();
  const [focused, setFocused] = useState(false);
  return (
    <View className="gap-2">
      {hideLabel ? null : <Text variant="label">{label}</Text>}
      <View
        className={`h-14 flex-row items-center gap-2 rounded-2xl border-2 bg-raised px-4 ${
          error ? 'border-danger' : focused ? 'border-ink' : 'border-line'
        }`}
      >
        {icon ? <MaterialCommunityIcons name={icon} size={22} color={colors.muted} /> : null}
        <TextInput
          accessibilityLabel={label}
          placeholderTextColor={colors.muted}
          className="h-full flex-1 font-body text-base text-ink"
          style={NO_OUTLINE}
          onFocus={(e) => {
            setFocused(true);
            onFocus?.(e);
          }}
          onBlur={(e) => {
            setFocused(false);
            onBlur?.(e);
          }}
          {...input}
        />
      </View>
      {error ? (
        <Text variant="caption" className="text-danger">
          {error}
        </Text>
      ) : hint ? (
        <Text variant="caption">{hint}</Text>
      ) : null}
    </View>
  );
}
