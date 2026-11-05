import { View } from 'react-native';
import Svg, { G, Line, Path, Rect, Text as SvgText } from 'react-native-svg';

import { niceTicks } from '@/lib/ticks';
import { useTheme } from '@/theme/ThemeProvider';

import { Text } from '../Text';
import { useScrub } from './useScrub';

interface Props {
  values: number[];
  xLabels: string[];
  /** Повна назва стовпчика для підказки (напр. «тиждень з 2 лист.») */
  tooltipLabels: string[];
  color: string;
  formatY: (v: number) => string;
  /** Формат поділок осі (один стиль на всю вісь); за замовчуванням — formatY */
  formatTick?: (v: number) => string;
  height?: number;
}

const PAD = { left: 44, right: 8, top: 18, bottom: 24 };
const MAX_BAR = 24;

/** Стовпчики: до 24 px, скруглений верх і рівна основа, значення на останньому стовпчику. */
export function ColumnChart({
  values,
  xLabels,
  tooltipLabels,
  color,
  formatY,
  formatTick,
  height = 180,
}: Props) {
  const { colors } = useTheme();
  const n = values.length;
  const { width, index, handlers } = useScrub(n, PAD.left, PAD.right);
  const ticks = niceTicks(0, Math.max(1, ...values), 3);
  const yMax = ticks.at(-1)!;
  const innerW = Math.max(1, width - PAD.left - PAD.right);
  const innerH = height - PAD.top - PAD.bottom;
  const band = innerW / Math.max(1, n);
  const barW = Math.min(MAX_BAR, band * 0.6);
  const cx = (i: number) => PAD.left + band * i + band / 2;
  const y = (v: number) => PAD.top + innerH - (v / yMax) * innerH;
  const base = PAD.top + innerH;

  // Прямокутник зі скругленими верхніми кутами (4 px), основа квадратна
  const bar = (i: number, v: number) => {
    const x0 = cx(i) - barW / 2;
    const top = y(v);
    const r = Math.min(4, barW / 2, base - top);
    return `M${x0},${base} L${x0},${top + r} Q${x0},${top} ${x0 + r},${top} L${x0 + barW - r},${top} Q${x0 + barW},${top} ${x0 + barW},${top + r} L${x0 + barW},${base} Z`;
  };

  return (
    <View style={{ height }} {...handlers}>
      {width > 0 ? (
        <Svg width={width} height={height}>
          {ticks.map((tk) => (
            <G key={tk}>
              <Line
                x1={PAD.left}
                x2={width - PAD.right}
                y1={y(tk)}
                y2={y(tk)}
                stroke={colors.line}
                strokeWidth={1}
              />
              <SvgText
                x={PAD.left - 6}
                y={y(tk) + 4}
                fontSize={11}
                fill={colors.muted}
                textAnchor="end"
              >
                {(formatTick ?? formatY)(tk)}
              </SvgText>
            </G>
          ))}
          {values.map((v, i) => (
            <G key={i} opacity={index === null || index === i ? 1 : 0.55}>
              {v > 0 ? <Path d={bar(i, v)} fill={color} /> : null}
              {/* Ціль для дотику ширша за стовпчик */}
              <Rect
                x={cx(i) - band / 2}
                y={PAD.top}
                width={band}
                height={innerH}
                fill="transparent"
              />
            </G>
          ))}
          {n > 0 && values[n - 1]! > 0 ? (
            <SvgText
              x={cx(n - 1)}
              y={y(values[n - 1]!) - 6}
              fontSize={12}
              fontWeight="600"
              fill={colors.ink}
              textAnchor="middle"
            >
              {formatY(values[n - 1]!)}
            </SvgText>
          ) : null}
          {xLabels.map((l, i) => (
            <SvgText
              key={`${l}-${i}`}
              x={cx(i)}
              y={height - 6}
              fontSize={11}
              fill={colors.muted}
              textAnchor="middle"
            >
              {l}
            </SvgText>
          ))}
        </Svg>
      ) : null}
      {index !== null && width > 0 ? (
        <View
          pointerEvents="none"
          style={{
            position: 'absolute',
            top: 0,
            left: Math.min(Math.max(0, cx(index) - 70), width - 140),
            width: 140,
          }}
          className="gap-1 rounded-xl bg-raised px-3 py-2 shadow-sm"
        >
          <Text variant="label">{formatY(values[index] ?? 0)}</Text>
          <Text variant="caption">{tooltipLabels[index]}</Text>
        </View>
      ) : null}
    </View>
  );
}
