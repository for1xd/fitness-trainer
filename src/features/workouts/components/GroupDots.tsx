import { View } from 'react-native';

import type { MuscleGroup } from '@/features/catalog/data';
import type { Palette } from '@/theme/tokens';
import { useTheme } from '@/theme/ThemeProvider';

/** Кольори груп м'язів у календарі: ті самі кольори дисків, що й у харчуванні. */
export function groupColor(group: string, colors: Palette): string {
  const map: Record<MuscleGroup, string> = {
    chest: colors['plate-red'],
    back: colors['plate-blue'],
    legs: colors['plate-green'],
    shoulders: colors['plate-yellow'],
    arms: colors.ink,
    core: colors.muted,
  };
  return map[group as MuscleGroup] ?? colors.muted;
}

export function GroupDots({ groups, size = 8 }: { groups: string[]; size?: number }) {
  const { colors } = useTheme();
  return (
    <View className="flex-row gap-1" importantForAccessibility="no-hide-descendants">
      {groups.slice(0, 4).map((g) => (
        <View
          key={g}
          style={{
            width: size,
            height: size,
            borderRadius: size / 2,
            backgroundColor: groupColor(g, colors),
          }}
        />
      ))}
    </View>
  );
}
