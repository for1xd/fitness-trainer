import { Pressable, View } from 'react-native';

import { Text } from './Text';

interface Props {
  title: string;
  description?: string;
  /** Додаткова інформація праворуч (наприклад, «≈ 0,5 кг на тиждень»). */
  aside?: string;
  selected: boolean;
  onPress: () => void;
}

/** Варіант вибору (радіо). Вибраний — з товстою рамкою кольору тексту. */
export function ChoiceCard({ title, description, aside, selected, onPress }: Props) {
  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityState={{ checked: selected }}
      onPress={onPress}
      className={`min-h-14 flex-row items-center gap-3 rounded-2xl border-2 px-4 py-3 active:opacity-80 ${
        selected ? 'border-ink bg-raised' : 'border-line bg-surface'
      }`}
    >
      <View
        className={`h-5 w-5 items-center justify-center rounded-full border-2 ${
          selected ? 'border-ink' : 'border-muted'
        }`}
      >
        {selected ? <View className="h-2.5 w-2.5 rounded-full bg-ink" /> : null}
      </View>
      <View className="flex-1">
        <Text variant="label">{title}</Text>
        {description ? <Text variant="caption">{description}</Text> : null}
      </View>
      {aside ? (
        <Text variant="caption" className="text-right">
          {aside}
        </Text>
      ) : null}
    </Pressable>
  );
}
