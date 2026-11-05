import Svg, { Circle, Line } from 'react-native-svg';

import { useTheme } from '@/theme/ThemeProvider';

/** Частка кола, яку займає дуга знака (відкрита чверть — як незакритий прогрес). */
export const LOGO_ARC_SHARE = 0.75;

interface Props {
  size: number;
  /** 0…1 — наскільки «заповнена» дуга (для анімації появи) */
  progress?: number;
  /** Однотонний варіант */
  mono?: string;
  /** Явні кольори — коли тема ще недоступна (заставка до завантаження) */
  arcColor?: string;
  stemColor?: string;
}

/**
 * Знак застосунку: «Ф» як кільце прогресу. Геометрія — як у assets/brand (полотно 512):
 * коло R=136, товщина 60; риска виходить за коло на 42.
 */
export function LogoMark({ size, progress = 1, mono, arcColor, stemColor }: Props) {
  const { colors } = useTheme();
  const k = size / 512;
  const r = 136 * k;
  const w = 60 * k;
  const c = 2 * Math.PI * r;
  const arc = Math.max(0, Math.min(1, progress)) * LOGO_ARC_SHARE * c;
  const ext = (136 + 42) * k;
  const mid = size / 2;
  return (
    <Svg width={size} height={size} accessibilityElementsHidden importantForAccessibility="no">
      {arc > 0 ? (
        <Circle
          cx={mid}
          cy={mid}
          r={r}
          fill="none"
          stroke={mono ?? arcColor ?? colors.accent}
          strokeWidth={w}
          strokeLinecap="round"
          strokeDasharray={`${arc} ${c}`}
          // Старт угорі, за годинниковою стрілкою
          transform={`rotate(-90 ${mid} ${mid})`}
        />
      ) : null}
      <Line
        x1={mid}
        y1={mid - ext}
        x2={mid}
        y2={mid + ext}
        stroke={mono ?? stemColor ?? colors.ink}
        strokeWidth={w}
        strokeLinecap="round"
      />
    </Svg>
  );
}
