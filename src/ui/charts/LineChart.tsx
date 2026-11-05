import { View } from 'react-native';
import Svg, { Circle, G, Line, Path, Text as SvgText } from 'react-native-svg';

import { niceTicks } from '@/lib/ticks';
import { useTheme } from '@/theme/ThemeProvider';

import { Text } from '../Text';
import { useScrub } from './useScrub';

export interface LineSeries {
  key: string;
  label: string;
  color: string;
  /** Значення по точках X; null — немає даних (лінія переривається) */
  values: (number | null)[];
  /** Лише точки без лінії (сирі зважування під лінією тренду) */
  dotsOnly?: boolean;
}

interface Props {
  series: LineSeries[];
  xLabels: string[];
  height?: number;
  formatY: (v: number) => string;
  /** Підписи осі X: показувати кожну n-ту */
  xEvery?: number;
}

const PAD = { left: 40, right: 48, top: 12, bottom: 24 };

/** Лінійний графік: одна вісь Y, тонка сітка, підпис лише в кінці лінії, перехрестя з підказкою. */
export function LineChart({ series, xLabels, height = 200, formatY, xEvery }: Props) {
  const { colors } = useTheme();
  const n = xLabels.length;
  const { width, index, handlers } = useScrub(n, PAD.left, PAD.right);

  const all = series.flatMap((s) => s.values.filter((v): v is number => v !== null));
  const ticks = niceTicks(Math.min(...all), Math.max(...all), 4);
  const yMin = ticks[0]!;
  const yMax = ticks.at(-1)!;
  const innerW = Math.max(1, width - PAD.left - PAD.right);
  const innerH = height - PAD.top - PAD.bottom;
  const x = (i: number) => PAD.left + (n <= 1 ? innerW / 2 : (i / (n - 1)) * innerW);
  const y = (v: number) => PAD.top + innerH - ((v - yMin) / (yMax - yMin || 1)) * innerH;
  const every = xEvery ?? Math.max(1, Math.ceil(n / 5));

  const pathOf = (values: (number | null)[]) => {
    let d = '';
    let pen = false;
    values.forEach((v, i) => {
      if (v === null) {
        pen = false;
        return;
      }
      d += `${pen ? 'L' : 'M'}${x(i).toFixed(1)},${y(v).toFixed(1)} `;
      pen = true;
    });
    return d;
  };

  const lineSeries = series.filter((s) => !s.dotsOnly);
  const lastOf = (s: LineSeries) => {
    for (let i = s.values.length - 1; i >= 0; i--) if (s.values[i] !== null) return i;
    return -1;
  };

  return (
    <View className="gap-2">
      {series.length > 1 ? (
        <View className="flex-row flex-wrap gap-4" importantForAccessibility="no-hide-descendants">
          {series.map((s) => (
            <View key={s.key} className="flex-row items-center gap-2">
              {s.dotsOnly ? (
                <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: s.color }} />
              ) : (
                <View style={{ width: 14, height: 2, borderRadius: 1, backgroundColor: s.color }} />
              )}
              <Text variant="caption">{s.label}</Text>
            </View>
          ))}
        </View>
      ) : null}

      <View style={{ height }} {...handlers}>
        {width > 0 && all.length ? (
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
                  {formatY(tk)}
                </SvgText>
              </G>
            ))}
            {xLabels.map((l, i) =>
              i % every === 0 || i === n - 1 ? (
                <SvgText
                  key={`${l}-${i}`}
                  x={x(i)}
                  y={height - 6}
                  fontSize={11}
                  fill={colors.muted}
                  textAnchor="middle"
                >
                  {l}
                </SvgText>
              ) : null,
            )}
            {index !== null ? (
              <Line
                x1={x(index)}
                x2={x(index)}
                y1={PAD.top}
                y2={PAD.top + innerH}
                stroke={colors.muted}
                strokeWidth={1}
              />
            ) : null}
            {series
              .filter((s) => s.dotsOnly)
              .map((s) =>
                s.values.map((v, i) =>
                  v === null ? null : (
                    <Circle
                      key={`${s.key}-${i}`}
                      cx={x(i)}
                      cy={y(v)}
                      r={3}
                      fill={s.color}
                      stroke={colors.surface}
                      strokeWidth={1.5}
                    />
                  ),
                ),
              )}
            {lineSeries.map((s) => (
              <Path
                key={s.key}
                d={pathOf(s.values)}
                stroke={s.color}
                strokeWidth={2}
                fill="none"
                strokeLinejoin="round"
                strokeLinecap="round"
              />
            ))}
            {lineSeries.map((s) => {
              const li = lastOf(s);
              const v = li >= 0 ? s.values[li] : null;
              if (v === null || v === undefined) return null;
              return (
                <G key={`${s.key}-end`}>
                  <Circle
                    cx={x(li)}
                    cy={y(v)}
                    r={4}
                    fill={s.color}
                    stroke={colors.surface}
                    strokeWidth={2}
                  />
                  <SvgText
                    x={x(li) + 8}
                    y={y(v) + 4}
                    fontSize={12}
                    fontWeight="600"
                    fill={colors.ink}
                  >
                    {formatY(v)}
                  </SvgText>
                </G>
              );
            })}
            {index !== null
              ? lineSeries.map((s) => {
                  const v = s.values[index];
                  return v === null || v === undefined ? null : (
                    <Circle
                      key={`${s.key}-hover`}
                      cx={x(index)}
                      cy={y(v)}
                      r={5}
                      fill={s.color}
                      stroke={colors.surface}
                      strokeWidth={2}
                    />
                  );
                })
              : null}
          </Svg>
        ) : null}
        {index !== null && width > 0 ? (
          <View
            pointerEvents="none"
            style={{
              position: 'absolute',
              top: 0,
              left: Math.min(Math.max(0, x(index) - 70), width - 140),
              width: 140,
            }}
            className="gap-1 rounded-xl bg-raised px-3 py-2 shadow-sm"
          >
            <Text variant="caption">{xLabels[index]}</Text>
            {series.map((s) => {
              const v = s.values[index];
              return v === null || v === undefined ? null : (
                <View key={s.key} className="flex-row items-center gap-2">
                  <View style={{ width: 10, height: 2, backgroundColor: s.color }} />
                  <Text variant="label">{formatY(v)}</Text>
                  <Text variant="caption">{s.label}</Text>
                </View>
              );
            })}
          </View>
        ) : null}
      </View>
    </View>
  );
}
