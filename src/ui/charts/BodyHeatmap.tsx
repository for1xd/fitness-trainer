import { View } from 'react-native';
import Svg, { Circle, Ellipse, G, Path, Rect } from 'react-native-svg';

import { useTheme } from '@/theme/ThemeProvider';

import { Text } from '../Text';

type Shape =
  | { kind: 'e'; cx: number; cy: number; rx: number; ry: number }
  | { kind: 'r'; x: number; y: number; w: number; h: number; r: number }
  | { kind: 'p'; d: string };

/** Спрощений силует 100×220: м'язові зони поверх нейтрального контуру. */
const FRONT: Record<string, Shape[]> = {
  front_delts: [
    { kind: 'e', cx: 33, cy: 43, rx: 6, ry: 6 },
    { kind: 'e', cx: 67, cy: 43, rx: 6, ry: 6 },
  ],
  side_delts: [
    { kind: 'e', cx: 25, cy: 47, rx: 3.5, ry: 6 },
    { kind: 'e', cx: 75, cy: 47, rx: 3.5, ry: 6 },
  ],
  chest: [
    { kind: 'r', x: 37, y: 42, w: 12, h: 15, r: 5 },
    { kind: 'r', x: 51, y: 42, w: 12, h: 15, r: 5 },
  ],
  biceps: [
    { kind: 'e', cx: 25, cy: 64, rx: 4.5, ry: 10 },
    { kind: 'e', cx: 75, cy: 64, rx: 4.5, ry: 10 },
  ],
  forearms: [
    { kind: 'e', cx: 21, cy: 88, rx: 3.8, ry: 11 },
    { kind: 'e', cx: 79, cy: 88, rx: 3.8, ry: 11 },
  ],
  abs: [{ kind: 'r', x: 44, y: 60, w: 12, h: 30, r: 4 }],
  obliques: [
    { kind: 'e', cx: 39, cy: 76, rx: 3.5, ry: 11 },
    { kind: 'e', cx: 61, cy: 76, rx: 3.5, ry: 11 },
  ],
  quads: [
    { kind: 'e', cx: 41, cy: 124, rx: 7, ry: 21 },
    { kind: 'e', cx: 59, cy: 124, rx: 7, ry: 21 },
  ],
  adductors: [
    { kind: 'e', cx: 47, cy: 112, rx: 2.5, ry: 9 },
    { kind: 'e', cx: 53, cy: 112, rx: 2.5, ry: 9 },
  ],
};

const BACK: Record<string, Shape[]> = {
  traps: [{ kind: 'p', d: 'M50 30 L62 40 L56 52 L44 52 L38 40 Z' }],
  rear_delts: [
    { kind: 'e', cx: 32, cy: 44, rx: 6, ry: 6 },
    { kind: 'e', cx: 68, cy: 44, rx: 6, ry: 6 },
  ],
  upper_back: [{ kind: 'r', x: 41, y: 52, w: 18, h: 12, r: 4 }],
  lats: [
    { kind: 'e', cx: 37, cy: 68, rx: 5.5, ry: 12 },
    { kind: 'e', cx: 63, cy: 68, rx: 5.5, ry: 12 },
  ],
  lower_back: [{ kind: 'r', x: 44, y: 76, w: 12, h: 14, r: 4 }],
  triceps: [
    { kind: 'e', cx: 25, cy: 63, rx: 4.5, ry: 10 },
    { kind: 'e', cx: 75, cy: 63, rx: 4.5, ry: 10 },
  ],
  forearms: [
    { kind: 'e', cx: 21, cy: 88, rx: 3.8, ry: 11 },
    { kind: 'e', cx: 79, cy: 88, rx: 3.8, ry: 11 },
  ],
  glutes: [
    { kind: 'e', cx: 43, cy: 100, rx: 7.5, ry: 8 },
    { kind: 'e', cx: 57, cy: 100, rx: 7.5, ry: 8 },
  ],
  abductors: [
    { kind: 'e', cx: 34, cy: 104, rx: 2.5, ry: 7 },
    { kind: 'e', cx: 66, cy: 104, rx: 2.5, ry: 7 },
  ],
  hamstrings: [
    { kind: 'e', cx: 42, cy: 128, rx: 6.5, ry: 18 },
    { kind: 'e', cx: 58, cy: 128, rx: 6.5, ry: 18 },
  ],
  calves: [
    { kind: 'e', cx: 42, cy: 166, rx: 5, ry: 13 },
    { kind: 'e', cx: 58, cy: 166, rx: 5, ry: 13 },
  ],
};

/** Нейтральний контур тіла (не дані): голова, тулуб, руки, ноги. */
function Outline({ color }: { color: string }) {
  return (
    <G fill={color}>
      <Circle cx={50} cy={14} r={9} />
      <Rect x={46} y={22} width={8} height={8} rx={3} />
      <Rect x={30} y={34} width={40} height={60} rx={14} />
      <Rect x={17} y={38} width={13} height={64} rx={6.5} />
      <Rect x={70} y={38} width={13} height={64} rx={6.5} />
      <Rect x={33} y={90} width={34} height={22} rx={10} />
      <Rect x={33} y={100} width={16} height={100} rx={8} />
      <Rect x={51} y={100} width={16} height={100} rx={8} />
    </G>
  );
}

function Figure({
  shapes,
  fillOf,
  outline,
}: {
  shapes: Record<string, Shape[]>;
  fillOf: (m: string) => string;
  outline: string;
}) {
  return (
    <Svg width="100%" height="100%" viewBox="0 0 100 210">
      <Outline color={outline} />
      {Object.entries(shapes).map(([muscle, list]) =>
        list.map((s, i) => {
          const fill = fillOf(muscle);
          if (s.kind === 'e')
            return (
              <Ellipse key={`${muscle}${i}`} cx={s.cx} cy={s.cy} rx={s.rx} ry={s.ry} fill={fill} />
            );
          if (s.kind === 'r')
            return (
              <Rect
                key={`${muscle}${i}`}
                x={s.x}
                y={s.y}
                width={s.w}
                height={s.h}
                rx={s.r}
                fill={fill}
              />
            );
          return <Path key={`${muscle}${i}`} d={s.d} fill={fill} />;
        }),
      )}
    </Svg>
  );
}

interface Props {
  /** Кошик 0–4 для кожного м'яза */
  binOf: (muscleId: string) => number;
  labels: { front: string; back: string; bins: string[] };
  accessibilityLabel: string;
}

/** Теплова карта: послідовна шкала одного тону (від фону до кольору тексту), легенда з межами. */
export function BodyHeatmap({ binOf, labels, accessibilityLabel }: Props) {
  const { colors } = useTheme();
  const OPACITY = [0, 0.22, 0.45, 0.7, 0.95];
  const fillFor = (bin: number) => (bin === 0 ? colors.raised : colors.ink);
  const shade = (muscle: string) => {
    const bin = binOf(muscle);
    return bin === 0 ? colors.raised : withOpacity(colors.ink, OPACITY[bin] ?? 1);
  };
  return (
    <View className="gap-3" accessible accessibilityLabel={accessibilityLabel}>
      <View className="flex-row justify-center gap-6">
        {[
          { key: 'front', shapes: FRONT, label: labels.front },
          { key: 'back', shapes: BACK, label: labels.back },
        ].map((f) => (
          <View key={f.key} className="items-center gap-1">
            <View style={{ width: 140, height: 294 }}>
              <Figure shapes={f.shapes} fillOf={shade} outline={colors.line} />
            </View>
            <Text variant="caption">{f.label}</Text>
          </View>
        ))}
      </View>
      <View
        className="flex-row flex-wrap justify-center gap-3"
        importantForAccessibility="no-hide-descendants"
      >
        {labels.bins.map((l, bin) => (
          <View key={l} className="flex-row items-center gap-2">
            <View
              style={{
                width: 12,
                height: 12,
                borderRadius: 3,
                backgroundColor:
                  bin === 0 ? fillFor(0) : withOpacity(colors.ink, OPACITY[bin] ?? 1),
                borderWidth: bin === 0 ? 1 : 0,
                borderColor: colors.line,
              }}
            />
            <Text variant="caption">{l}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

function withOpacity(hex: string, a: number) {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${a})`;
}
