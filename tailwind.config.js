/** Кольори беруться з CSS-змінних, які задає ThemeProvider (src/theme). */
const c = (name) => `rgb(var(--${name}) / <alpha-value>)`;

/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{ts,tsx}'],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: {
        bg: c('bg'),
        surface: c('surface'),
        raised: c('raised'),
        ink: c('ink'),
        muted: c('muted'),
        line: c('line'),
        inverse: c('inverse'),
        // Кольори дисків (IWF): кодують дані, а не прикрашають
        protein: c('plate-red'),
        water: c('plate-blue'),
        fat: c('plate-yellow'),
        carbs: c('plate-green'),
        warn: c('warn'),
        danger: c('danger'),
      },
      fontFamily: {
        display: ['Unbounded_600SemiBold'],
        'display-bold': ['Unbounded_700Bold'],
        body: ['Manrope_500Medium'],
        'body-semibold': ['Manrope_600SemiBold'],
        'body-bold': ['Manrope_700Bold'],
      },
      borderRadius: {
        plate: '999px',
      },
    },
  },
  plugins: [],
};
