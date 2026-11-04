# Браузерні тести (Playwright)

Перевіряють веб-збірку наскрізь: онбординг, щоденник, рецепти, воду, тренування, фото й штрихкоди, прогрес.

```bash
npx expo export -p web                                   # → dist/
EXPO_PUBLIC_SUPABASE_URL=http://sb.test EXPO_PUBLIC_SUPABASE_ANON_KEY=test \
  npx expo export -p web --output-dir dist-sb            # для stage4 (сервер підміняється в тесті)
node e2e/stage2.js   # харчування, вода, рецепти
node e2e/stage3.js   # сила, зал, програма, живе тренування, календар
node e2e/stage4.js   # фото страви (підмінений Supabase + Claude), штрихкоди
node e2e/stage5.js   # прогрес, заміри, фото до/після, нагадування
npm run build:artifact && node e2e/artifact-check.js     # збірка для артефакту з вкладеного шляху
```

Скриншоти зберігаються в `e2e/shots*/` (не комітяться).
