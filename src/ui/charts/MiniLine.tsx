import { useState } from 'react';
import { View } from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';

import { useTheme } from '@/theme/ThemeProvider';

import { Text } from '../Text';

interface Props {
  title: string;
  values: number[];
  formatValue: (v: number) => string;
  /** Підпис зміни від першого до останнього значення */
  delta?: string;
}

/** Малий графік для порівняння показників поруч (small multiples): лінія, кінцева точка, остання цифра. */
export function MiniLine({ title, values, formatValue, delta }: Props) {
  const { colors } = useTheme();
  // Реальна ширина — щоб точка лишалась кругом (без розтягування viewBox)
  const [W, setW] = useState(140);
  const H = 44;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const x = (i: number) =>
    4 + (values.length <= 1 ? (W - 8) / 2 : (i / (values.length - 1)) * (W - 8));
  const y = (v: number) => 6 + (H - 12) * (1 - (max === min ? 0.5 : (v - min) / (max - min)));
  const d = values.map((v, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(' ');
  const last = values.at(-1);
  return (
    <View className="min-w-[150px] flex-1 gap-1 rounded-2xl bg-bg p-3">
      <Text variant="caption" numberOfLines={1}>
        {title}
      </Text>
      <View className="flex-row items-baseline gap-2">
        <Text variant="number" className="text-xl">
          {last !== undefined ? formatValue(last) : '—'}
        </Text>
        {delta ? <Text variant="caption">{delta}</Text> : null}
      </View>
      {values.length > 1 ? (
        <View onLayout={(e) => setW(Math.max(40, e.nativeEvent.layout.width))}>
          <Svg width={W} height={H}>
            <Path
              d={d}
              stroke={colors.ink}
              strokeWidth={2}
              fill="none"
              strokeLinejoin="round"
              strokeLinecap="round"
            />
            {last !== undefined ? (
              <Circle
                cx={x(values.length - 1)}
                cy={y(last)}
                r={4}
                fill={colors.ink}
                stroke={colors.bg}
                strokeWidth={2}
              />
            ) : null}
          </Svg>
        </View>
      ) : null}
    </View>
  );
}
