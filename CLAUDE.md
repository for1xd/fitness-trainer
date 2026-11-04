# CLAUDE.md — Фітнес-тренер

Кросплатформений фітнес-тренер (iOS / Android / веб) для набору маси, схуднення та підтримки форми.
Мова інтерфейсу — українська, з i18n (англійська — пізніше). Детальний план — `docs/PLAN.md`.

## Стек
- **Expo (React Native) + TypeScript strict + Expo Router** — один код для iOS, Android, веб.
- **Supabase** — Auth, Postgres (RLS), Storage (фото), Edge Functions (Deno).
- **TanStack Query** — серверний стан; **Zustand** — локальний/UI-стан (живе тренування, онбординг).
- **NativeWind v4** — стилі (Tailwind-токени, темна/світла теми).
- **Офлайн**: `expo-sqlite` + Drizzle ORM як локальний кеш, outbox-черга для синхронізації.
- **i18n**: `i18next` + `react-i18next`, ключі в `src/i18n/locales/{uk,en}.json`.
- **Тести**: Jest (`jest-expo`) для логіки; Playwright (скіл `webapp-testing`) — для веб-версії.

## Структура
```
app/                     # Expo Router: лише екрани та layout-и, мінімум логіки
  (auth)/  (onboarding)/  (tabs)/{today,nutrition,workouts,progress,profile}/
src/
  features/<feature>/    # nutrition, water, onboarding, strength, workouts, catalog, progress, profile
    logic/               # чисті функції (формули) + *.test.ts — без React і без I/O
    api/                 # запити до Supabase / локальної БД
    hooks/  components/  store.ts
  ui/                    # дизайн-система: Button, Card, Ring, Sheet, …
  lib/                   # supabase client, db (sqlite+drizzle), sync, i18n, units
  theme/                 # токени кольорів, типографіка, spacing
supabase/
  migrations/            # SQL-міграції (схема + RLS)
  functions/             # Edge Functions: analyze-meal, food-search, barcode-lookup
  seed/                  # JSON: exercises, machines, ua-dishes; seed.sql генерується скриптом
docs/                    # PLAN.md, схеми, промти для AI
```

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

## Команди (після етапу 1)
```
npm install
npx expo start            # dev (i — iOS, a — Android, w — веб)
npm test                  # юніт-тести формул
npm run lint / typecheck
npx supabase start        # локальний Supabase (Docker)
npx supabase db reset     # міграції + seed
```
