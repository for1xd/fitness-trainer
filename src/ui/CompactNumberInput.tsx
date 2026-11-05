import { useState } from 'react';
import { Platform, TextInput, View } from 'react-native';

import { useTheme } from '@/theme/ThemeProvider';

import { Text } from './Text';

interface Props {
  /** Підпис для екранних читачів (візуально поле підписане заголовком колонки) */
  label: string;
  value: number | undefined;
  onChange: (value: number | undefined) => void;
  /** Підказка всередині поля, напр. запланована вага */
  placeholder?: string;
  decimal?: boolean;
  suffix?: string;
  width?: number;
  editable?: boolean;
}

const toText = (v: number | undefined) => (v === undefined ? '' : String(v).replace('.', ','));

/** Невелике числове поле для таблиць (вага й повтори в підходах, грами в рецепті). */
export function CompactNumberInput({
  label,
  value,
  onChange,
  placeholder,
  decimal = false,
  suffix,
  width = 76,
  editable = true,
}: Props) {
  const { colors } = useTheme();
  const [text, setText] = useState(toText(value));
  const [synced, setSynced] = useState(value);
  const [focused, setFocused] = useState(false);
  if (value !== synced) {
    setSynced(value);
    if (value !== Number(text.replace(',', '.'))) setText(toText(value));
  }

  return (
    <View
      style={{ width }}
      className={`h-12 flex-row items-center justify-center rounded-xl border-2 bg-raised px-2 ${
        focused ? 'border-accent' : 'border-line'
      } ${editable ? '' : 'opacity-60'}`}
    >
      <TextInput
        accessibilityLabel={label}
        value={text}
        editable={editable}
        onChangeText={(raw) => {
          const clean = raw.replace(decimal ? /[^0-9.,]/g : /[^0-9]/g, '');
          setText(clean);
          const n = Number(clean.replace(',', '.'));
          onChange(clean === '' || Number.isNaN(n) ? undefined : n);
        }}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        keyboardType={decimal ? 'decimal-pad' : 'number-pad'}
        inputMode={decimal ? 'decimal' : 'numeric'}
        placeholder={placeholder}
        placeholderTextColor={colors.muted}
        selectTextOnFocus
        maxLength={6}
        style={{
          flex: 1,
          minWidth: 0,
          ...(Platform.OS === 'web' ? ({ outlineStyle: 'none' } as object) : {}),
        }}
        className="h-full text-center font-body-bold text-lg text-ink"
      />
      {suffix ? <Text variant="caption">{suffix}</Text> : null}
    </View>
  );
}
