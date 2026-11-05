import { Text as RNText, type TextStyle } from 'react-native';

import { useTheme } from '@/theme/ThemeProvider';

export interface FitTextProps {
  text: string;
  /** Найбільша доступна ширина, px */
  maxWidth: number;
  maxFontSize: number;
  minFontSize?: number;
  fontFamily?: string;
  color?: string;
  accessibilityLabel?: string;
}

let canvas: HTMLCanvasElement | null = null;

/** Ширина тексту в px для шрифту `size px family` (веб: вимірювання через canvas). */
function measure(text: string, size: number, family: string): number {
  if (typeof document === 'undefined') return text.length * size * 0.7;
  canvas ??= document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  if (!ctx) return text.length * size * 0.7;
  ctx.font = `${size}px "${family}"`;
  return ctx.measureText(text).width;
}

/**
 * Веб-версія: розмір шрифту підбирається під ширину, щоб число не виходило за межі (напр. кільця).
 * Табличні цифри — число не «стрибає», коли змінюється.
 */
export function FitText({
  text,
  maxWidth,
  maxFontSize,
  minFontSize = 12,
  fontFamily = 'Unbounded_600SemiBold',
  color,
  accessibilityLabel,
}: FitTextProps) {
  const { colors } = useTheme();
  const width = measure(text, maxFontSize, fontFamily);
  // Запас 8 %: відмінності рендерингу шрифту між canvas і DOM
  const fitted = Math.floor((maxFontSize * maxWidth * 0.92) / Math.max(1, width));
  const size = Math.max(minFontSize, Math.min(maxFontSize, fitted));
  const style: TextStyle = {
    fontFamily,
    fontSize: size,
    lineHeight: Math.round(size * 1.15),
    color: color ?? colors.ink,
    fontVariant: ['tabular-nums'],
    maxWidth,
    textAlign: 'center',
  };
  return (
    <RNText numberOfLines={1} style={style} accessibilityLabel={accessibilityLabel}>
      {text}
    </RNText>
  );
}
