# CLAUDE.md — Фітнес-тренер

Кросплатформений фітнес-тренер (iOS / Android / веб) для набору маси, схуднення та підтримки форми.
Мова інтерфейсу — українська, з i18n (англійська — пізніше). Детальний план — `docs/PLAN.md`.

## Стек

- **Expo (React Native) + TypeScript strict + Expo Router** — один код для iOS, Android, веб.
- **Supabase** — Auth, Postgres (RLS), Storage (фото), Edge Functions (Deno).
- **TanStack Query** — серверний стан; **Zustand** — локальний/UI-стан (живе тренування, онбординг).
- **NativeWind v4** — стилі (Tailwind-токени, темна/світла теми).
- **Офлайн**: zustand + persist (AsyncStorage / localStorage) як локальне джерело правди;
  зміни йдуть у чергу `src/lib/sync` (outbox) і відправляються в Supabase, коли користувач увійшов.
  Злиття з сервера — «останній запис перемагає» за `updated_at`, видалення — м'які (`deleted_at`).
  SQLite + Drizzle — коли обсяг даних виросте (на вебі потребує COOP/COEP-заголовків).
- **i18n**: `i18next` + `react-i18next`, ключі в `src/i18n/locales/{uk,en}.json`.
- **Тести**: Jest (`jest-expo`) для логіки; Playwright (скіл `webapp-testing`) — для веб-версії.

## Структура

```
src/
  app/                   # Expo Router: лише екрани та layout-и, мінімум логіки
    sign-in.tsx  onboarding/  (tabs)/{index,nutrition,workouts,progress,profile}.tsx
  features/<feature>/    # nutrition, water, onboarding, strength, workouts, catalog, progress, profile
    logic/               # чисті функції (формули) + *.test.ts — без React і без I/O
    api/                 # запити до Supabase / локальної БД
    hooks/  components/  store.ts
  ui/                    # дизайн-система: Button, Card, Ring, Sheet, …
  lib/                   # supabase client, db (sqlite+drizzle), sync, форматування, дати
  i18n/                  # i18next + locales/{uk,en}.json (ключі однакові — є тест)
  theme/                 # палітра (CSS-змінні для NativeWind), ThemeProvider
supabase/
  migrations/            # SQL-міграції (схема + RLS)
  functions/             # Edge Functions: analyze-meal, food-search, barcode-lookup
  seed/                  # JSON: exercises, machines, ua-dishes; seed.sql генерується скриптом
docs/                    # PLAN.md, схеми, промти для AI
```

## Дані та синхронізація

- Кожна таблиця користувача реєструється в `features/<f>/api/sync.ts` через `registerSyncTable`
  (порядок відправки, колонка власника, `applyRemote`). Новий модуль = таблиця в міграції + реєстрація.
- id записів генерує клієнт (`expo-crypto` randomUUID) — записи можна створювати офлайн і без акаунта;
  після входу черга відправить усе, що накопичилось.
- Перетворення «запис ↔ рядок таблиці» — у `api/rows.ts` з тестами.
- Довідники тренувань: `supabase/seed/catalog.json` (м'язи, обладнання, бренди, профілі залів) і
  `exercises.json` (порядок = пріоритет у генераторі; `pattern` — патерн руху для генератора й замін).
- Вбудована база продуктів: `supabase/seed/foods.json` (ті самі UUID, що в БД). Після зміни —
  `npm run seed:build` → `supabase/seed.sql`.
- Зовнішні бази (Open Food Facts, USDA) — лише через Edge Function `food-search`; розбір відповідей —
  `supabase/functions/_shared/foodMappers.ts` (без Deno-залежностей, тестується Jest).

## Дизайн

- Палітра «зал і крейда» (`src/theme/tokens.ts`). Кольори дисків IWF кодують лише дані:
  білки — червоний, жири — жовтий, вуглеводи — зелений, вода — синій.
- Кнопки — кольором тексту (`bg-ink`), не акцентом. Шрифти: Unbounded (цифри, заголовки), Manrope (текст).
- Без ALL CAPS-міток, градієнтів і скла. Головна цифра екрана — велика (`variant="hero"`).

## Правила коду

- TypeScript `strict`, без `any` (якщо неминуче — `unknown` + звуження).
- Формули — тільки в `features/*/logic`, чисті функції, одиниці в назвах (`weightKg`, `heightCm`), покриті юніт-тестами.
- Жодних ключів API в клієнті. Claude / USDA / інші ключі — лише в Edge Functions (`supabase secrets`). У клієнті — тільки `EXPO_PUBLIC_SUPABASE_URL` і anon key.
- Кожна таблиця з даними користувача має `user_id` і RLS-політику `user_id = auth.uid()`.
- Усі тексти UI — через `t('…')`, жодних захардкоджених рядків.
- Платформна специфіка — через `*.web.tsx` / `*.native.tsx` або `Platform.select`, не через розкидані `if`.
- Компоненти UI — лише з `src/ui`; великі сенсорні цілі (мін. 48 dp, основні дії в залі — 56+ dp).
- Перед комітом: `npm run lint && npm run typecheck && npm test`.
- Медичний дисклеймер «не є медичною порадою» — в онбордингу і на екрані норм.

## Скіли

- `.claude/skills/frontend-design` — для всього UI.
- `.claude/skills/webapp-testing` — перевірка веб-версії (`npx expo start --web`).

## Особливості середовища

- `npx expo install` потребує мережі до api.expo.dev; якщо вона закрита — `EXPO_OFFLINE=1 npx expo install <pkg>`
  (версії беруться з `node_modules/expo/bundledNativeModules.json`).
- TypeScript 6: `@types` не підключаються автоматично — список у `tsconfig.json → types`.

## Команди

```
npm install
npx expo start            # dev (i — iOS, a — Android, w — веб)
npm test                  # юніт-тести формул
npm run lint / typecheck
npx supabase start        # локальний Supabase (Docker)
npx supabase db reset     # міграції + seed
```
