/**
 * Палітра «зал і крейда».
 * Основа — крейда (світла) і гумове покриття залу (темна). Кольори даних — кольори
 * олімпійських дисків IWF: червоний 25 кг, синій 20, жовтий 15, зелений 10.
 * Кнопки — кольором тексту (ink), щоб акцентні кольори лишались тільки за даними.
 *
 * Рівні поверхонь: bg (фон) → surface (картки) → raised (поля, підказки); hairline — рамка карток.
 * accent — один акцентний колір: заповнення кільця калорій, активна вкладка, фокус.
 * Вторинний текст (muted) ≥ 6,7:1 на всіх поверхнях обох тем (WCAG AA — 4,5).
 *
 * Палітру даних перевірено валідатором dataviz (світла й темна теми, усі пари, дальтонізм):
 * різниця червоний↔зелений у межі 6–8 ΔE, тому кольорова позначка ЗАВЖДИ має підпис поруч.
 */
export const palettes = {
  light: {
    bg: '#E7EAE6',
    surface: '#F7F8F5',
    raised: '#FFFFFF',
    ink: '#14171A',
    muted: '#4D5550',
    line: '#C9CFC9',
    hairline: '#DCE0DB',
    accent: '#6F4FE0',
    inverse: '#F7F8F5',
    'plate-red': '#C42A30',
    'plate-blue': '#2158B5',
    'plate-yellow': '#D9A80B',
    'plate-green': '#2A8F6A',
    warn: '#9A5B00',
    danger: '#B3261E',
  },
  dark: {
    bg: '#101315',
    surface: '#1C2023',
    raised: '#282D31',
    ink: '#EEF1EC',
    muted: '#AEB6B0',
    line: '#3C4348',
    hairline: '#2A3034',
    accent: '#9A7BF2',
    inverse: '#14171A',
    'plate-red': '#E04862',
    'plate-blue': '#7B8BEA',
    'plate-yellow': '#B8890F',
    'plate-green': '#1E9A80',
    warn: '#E7A33A',
    danger: '#F2817A',
  },
} as const;

export type SchemeName = keyof typeof palettes;
export type TokenName = keyof (typeof palettes)['light'];
export type Palette = Record<TokenName, string>;

const hexToRgbTriplet = (hex: string) => {
  const n = parseInt(hex.slice(1), 16);
  return `${(n >> 16) & 255} ${(n >> 8) & 255} ${n & 255}`;
};

/** CSS-змінні для NativeWind: `--bg: 233 236 232` → `rgb(var(--bg) / <alpha>)`. */
export function cssVariables(palette: Palette): Record<`--${string}`, string> {
  const out: Record<`--${string}`, string> = {};
  for (const [name, hex] of Object.entries(palette)) out[`--${name}`] = hexToRgbTriplet(hex);
  return out;
}

/** Мінімальна висота сенсорної цілі; основні дії в залі — 56. */
export const touch = { min: 48, gym: 56 } as const;
