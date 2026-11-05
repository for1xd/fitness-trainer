import { Text as RNText } from 'react-native';

import { useTheme } from '@/theme/ThemeProvider';

import type { FitTextProps } from './FitText';

/** Телефон: система сама зменшує шрифт, щоб текст влізла в один рядок заданої ширини. */
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
  return (
    <RNText
      numberOfLines={1}
      adjustsFontSizeToFit
      minimumFontScale={minFontSize / maxFontSize}
      accessibilityLabel={accessibilityLabel}
      style={{
        fontFamily,
        fontSize: maxFontSize,
        color: color ?? colors.ink,
        fontVariant: ['tabular-nums'],
        width: maxWidth,
        textAlign: 'center',
      }}
    >
      {text}
    </RNText>
  );
}
