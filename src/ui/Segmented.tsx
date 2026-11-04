import { Pressable, View } from 'react-native';

import { Text } from './Text';

interface Option<T extends string> {
  value: T;
  label: string;
}

interface Props<T extends string> {
  label: string;
  options: Option<T>[];
  value: T | undefined;
  onChange: (value: T) => void;
}

/** Перемикач на 2–4 короткі варіанти. */
export function Segmented<T extends string>({ label, options, value, onChange }: Props<T>) {
  return (
    <View className="gap-2">
      {label ? <Text variant="label">{label}</Text> : null}
      <View accessibilityRole="radiogroup" className="flex-row gap-2 rounded-2xl bg-surface p-1">
        {options.map((o) => {
          const selected = o.value === value;
          return (
            <Pressable
              key={o.value}
              accessibilityRole="radio"
              accessibilityState={{ checked: selected }}
              onPress={() => onChange(o.value)}
              className={`min-h-12 flex-1 items-center justify-center rounded-xl px-2 ${
                selected ? 'bg-ink' : 'active:bg-line'
              }`}
            >
              <Text variant="label" className={selected ? 'text-inverse' : 'text-ink'}>
                {o.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}
