import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { Pressable, View } from 'react-native';

import { formatNumber } from '@/lib/format';
import { useTheme } from '@/theme/ThemeProvider';
import { Text } from '@/ui';

import type { FoodSource, Nutrients } from '../types';

interface Props {
  name: string;
  brand?: string;
  source: FoodSource;
  per100: Nutrients;
  isRecipe?: boolean;
  onPress: () => void;
  first?: boolean;
}

export function FoodRow({ name, brand, source, per100, isRecipe, onPress, first }: Props) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const meta = [isRecipe ? t('food.myRecipes') : t(`food.source.${source}`), brand]
    .filter(Boolean)
    .join(', ');
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      className={`min-h-16 flex-row items-center gap-3 px-4 py-3 active:bg-line ${first ? '' : 'border-t border-line'}`}
    >
      <View className="flex-1 gap-1">
        <Text variant="body" numberOfLines={2}>
          {name}
        </Text>
        <Text variant="caption" numberOfLines={1}>
          {meta}
        </Text>
      </View>
      <Text variant="caption" className="text-right">
        {t('food.per100', { kcal: formatNumber(per100.kcal) })}
      </Text>
      <MaterialCommunityIcons name="chevron-right" size={20} color={colors.muted} />
    </Pressable>
  );
}
