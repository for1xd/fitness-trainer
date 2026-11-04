# Фітнес-тренер

Кросплатформений фітнес-тренер (iOS, Android, веб) для набору маси, схуднення та підтримки форми.
Expo + TypeScript + Supabase. Інтерфейс українською, закладено i18n (англійська вже є).

План і етапи — [`docs/PLAN.md`](docs/PLAN.md). Правила коду — [`CLAUDE.md`](CLAUDE.md).

## Що вже працює (етап 1)

- Вхід через Supabase (пошта + пароль) або режим без акаунта (дані на пристрої).
- Онбординг: стать, вік, зріст, вага, активність, мета і темп з оцінкою кг на тиждень.
- Норма КБЖВ (Міффлін — Сан Жеор), запобіжники (мінімум калорій, швидкий темп, вік < 18, ІМТ < 18,5) і дисклеймер.
- Зважування з 7-денним трендом. Якщо тренд змістився на 1 кг і більше, норми перераховуються самі.
- Темна і світла теми, бокова навігація на ПК.
- SQL-схема всієї бази з RLS-політиками і приватними бакетами для фото.
- Юніт-тести всіх формул: КБЖВ, 1ПМ (Еплі / Бжицкі), прогресія і deload, норма води, тренд ваги.

## Запуск

Потрібні Node.js 20+ і npm.

```bash
npm install
cp .env.example .env        # можна не заповнювати: тоді працює режим без акаунта
npx expo start              # w — браузер, i — iOS-симулятор, a — Android, або QR для Expo Go
```

### Локальний Supabase (потрібен Docker)

```bash
npx supabase start          # виведе API URL і anon key — встав їх у .env
npx supabase db reset       # застосує міграції з supabase/migrations
```

Для хмарного проєкту: `npx supabase link --project-ref <ref>` і `npx supabase db push`.
Ключі сторонніх API (Claude, USDA) задаються лише як секрети Edge Functions:
`npx supabase secrets set ANTHROPIC_API_KEY=...` — у клієнт вони не потрапляють ніколи.

## Перевірки

```bash
npm test                    # юніт-тести
npm run typecheck           # TypeScript strict
npm run lint                # ESLint (eslint-config-expo + prettier)
npm run format              # Prettier
npx expo export -p web      # збірка веб-версії в dist/
```

## Структура

```
src/app/          екрани (Expo Router)
src/features/     модулі: onboarding, profile, progress, water, strength, workouts, auth, settings
                  у кожному logic/ — чисті формули з тестами
src/ui/           дизайн-система
src/i18n/         переклади uk / en
supabase/         міграції, конфіг, seed
docs/PLAN.md      план, схема БД, етапи
```

> Розрахунки орієнтовні й не є медичною порадою.
