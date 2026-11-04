-- Початкова схема «Фітнес-тренер».
-- Правило: кожна таблиця з даними користувача має user_id і RLS user_id = auth.uid().
-- Довідники (вправи, тренажери, загальні продукти) доступні лише для читання.
-- id генерує клієнт (uuid), щоб записи можна було створювати офлайн.

create extension if not exists pg_trgm;

-- ───────────────────────── Типи ─────────────────────────
create type sex as enum ('male', 'female');
create type activity_level as enum ('sedentary', 'light', 'moderate', 'high', 'very_high');
create type goal as enum ('lose', 'maintain', 'gain');
create type pace as enum ('slow', 'normal', 'fast');
create type experience_level as enum ('beginner', 'intermediate', 'advanced');
-- ua_dish — українські страви, base — базові продукти (обидва з seed), off/usda — зовнішні бази
create type food_source as enum ('ua_dish', 'base', 'off', 'usda', 'user', 'ai');
create type meal_type as enum ('breakfast', 'lunch', 'dinner', 'snack');
create type entry_source as enum ('manual', 'barcode', 'photo', 'recipe');
create type body_region as enum ('upper', 'lower', 'core');
create type mechanics as enum ('compound', 'isolation');
create type one_rm_method as enum ('epley', 'brzycki', 'level');
create type confidence as enum ('high', 'medium', 'low');
create type workout_status as enum ('planned', 'done', 'skipped');

-- Спільний тригер updated_at (потрібен для синхронізації last-write-wins)
create function set_updated_at() returns trigger
language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ───────────────────────── Довідники тренувань ─────────────────────────
create table muscles (
  id text primary key,            -- 'chest', 'lats', 'quads' …
  name_uk text not null,
  name_en text not null,
  region body_region not null,
  group_id text not null          -- 'chest', 'back', 'shoulders', 'arms', 'legs', 'core' (кольори в календарі)
);

create table equipment_types (
  id text primary key,            -- 'barbell', 'dumbbell', 'cable', 'machine', 'bodyweight' …
  name_uk text not null,
  name_en text not null
);

create table brands (
  id text primary key,            -- 'interatletika', 'technogym' …
  name text not null,
  country text
);

create table machine_types (
  id text primary key,            -- 'smith', 'cable_crossover', 'hack_squat', 'leg_press_45' …
  name_uk text not null,
  name_en text not null,
  equipment_type_id text not null references equipment_types (id),
  category text not null,         -- група в «Мій зал»: free, legs, back, chest_shoulders, arms_core
  weight_step_kg numeric(4, 2) not null default 2.5
);

create table machines (
  id uuid primary key default gen_random_uuid(),
  brand_id text not null references brands (id),
  machine_type_id text not null references machine_types (id),
  model text,
  image_url text
);

create table exercises (
  id text primary key,            -- slug: 'barbell_back_squat'
  name_uk text not null,
  name_en text not null,
  primary_muscle_id text not null references muscles (id),
  secondary_muscle_ids text[] not null default '{}',
  equipment_type_id text not null references equipment_types (id),
  -- Усе обладнання, без якого вправу не виконати (id з machine_types); порожньо — власна вага
  required_equipment text[] not null default '{}',
  mechanics mechanics not null,
  region body_region not null,
  pattern text not null,          -- патерн руху: squat, hinge, h_push, v_pull … (для генератора й заміни)
  load_type text not null,        -- barbell, dumbbell (вага однієї гантелі), machine, cable, bodyweight, assisted, timed
  base_lift text,                 -- базова вправа для оцінки ваги: squat, bench, deadlift, ohp, row, pullup
  base_ratio numeric(4, 2),       -- 1ПМ вправи ≈ 1ПМ базової × коефіцієнт
  difficulty int not null default 1 check (difficulty between 1 and 3),
  technique_uk text,
  mistakes_uk text[] not null default '{}',
  media_url text
);
create index exercises_primary_muscle_idx on exercises (primary_muscle_id);

-- ───────────────────────── Профіль ─────────────────────────
create table profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text,
  sex sex not null,
  birth_date date not null,
  height_cm numeric(5, 1) not null check (height_cm between 100 and 250),
  activity_level activity_level not null,
  goal goal not null,
  pace pace not null default 'normal',
  experience_level experience_level,
  locale text not null default 'uk',
  active_gym_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table weight_entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  date date not null,
  weight_kg numeric(5, 2) not null check (weight_kg between 25 and 350),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  unique (user_id, date)
);

create table nutrition_targets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  valid_from date not null,
  weight_kg numeric(5, 2) not null,   -- вага, від якої рахували (для автоперерахунку)
  kcal int not null check (kcal > 0),
  protein_g int not null,
  fat_g int not null,
  carbs_g int not null,
  water_ml int not null,
  reason text not null check (reason in ('onboarding', 'weight_change', 'manual')),
  updated_at timestamptz not null default now()
);
create index nutrition_targets_user_idx on nutrition_targets (user_id, valid_from desc);

create table body_measurements (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  date date not null,
  waist_cm numeric(5, 1),
  chest_cm numeric(5, 1),
  biceps_cm numeric(5, 1),
  hips_cm numeric(5, 1),
  thigh_cm numeric(5, 1),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create table progress_photos (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  date date not null,
  angle text not null check (angle in ('front', 'side', 'back')),
  storage_path text not null,       -- progress-photos/{user_id}/…
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

-- ───────────────────────── Харчування ─────────────────────────
create table foods (
  id uuid primary key default gen_random_uuid(),
  source food_source not null,
  slug text unique,                -- для seed-даних: стабільний ідентифікатор
  category text,                   -- 'soups', 'mains', 'salads' … (для seed)
  external_id text,
  barcode text,
  name_uk text not null,
  name_en text,
  brand text,
  kcal_100g numeric(6, 1) not null check (kcal_100g >= 0),
  protein_100g numeric(5, 1) not null default 0,
  fat_100g numeric(5, 1) not null default 0,
  carbs_100g numeric(5, 1) not null default 0,
  owner_id uuid references auth.users (id) on delete cascade, -- null = загальна база
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);
-- Один зовнішній продукт (OFF/USDA) — один запис на власника; seed-рядки без external_id не обмежуються
create unique index foods_external_uidx on foods (
  coalesce(owner_id, '00000000-0000-0000-0000-000000000000'::uuid), source, external_id
) where external_id is not null;
create index foods_name_trgm_idx on foods using gin (name_uk gin_trgm_ops);
create index foods_barcode_idx on foods (barcode) where barcode is not null;

create table food_portions (
  id uuid primary key default gen_random_uuid(),
  food_id uuid not null references foods (id) on delete cascade,
  label_uk text not null,          -- «тарілка», «шт.», «ст. л.»
  label_en text,
  grams numeric(6, 1) not null check (grams > 0)
);

create table recipes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null,
  cooked_weight_g numeric(7, 1),   -- вага готової страви (з урахуванням уварювання)
  servings int not null default 1,
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create table recipe_ingredients (
  id uuid primary key default gen_random_uuid(),
  recipe_id uuid not null references recipes (id) on delete cascade,
  food_id uuid not null references foods (id),
  grams numeric(7, 1) not null check (grams > 0)
);

create table meal_entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  date date not null,              -- локальна дата щоденника
  eaten_at timestamptz not null,
  meal_type meal_type not null,
  food_id uuid references foods (id),
  recipe_id uuid references recipes (id),
  name text not null,              -- знімок назви на момент запису
  grams numeric(7, 1) not null check (grams > 0),
  kcal numeric(7, 1) not null,
  protein_g numeric(6, 1) not null,
  fat_g numeric(6, 1) not null,
  carbs_g numeric(6, 1) not null,
  source entry_source not null default 'manual',
  photo_analysis_id uuid,
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);
create index meal_entries_user_day_idx on meal_entries (user_id, date);

create table meal_photo_analyses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  storage_path text not null,
  model text not null,
  raw_json jsonb not null,
  overall_confidence numeric(3, 2),
  accepted boolean not null default false,
  created_at timestamptz not null default now()
);

create table water_entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  date date not null,
  at timestamptz not null,
  ml int not null check (ml > 0 and ml <= 3000),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);
create index water_entries_user_day_idx on water_entries (user_id, date);

-- ───────────────────────── Зали ─────────────────────────
create table gyms (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid references auth.users (id) on delete cascade, -- null = готовий профіль залу/мережі
  name text not null,
  chain text,
  city text,
  updated_at timestamptz not null default now()
);

create table gym_equipment (
  id uuid primary key default gen_random_uuid(),
  gym_id uuid not null references gyms (id) on delete cascade,
  machine_type_id text not null references machine_types (id),
  machine_id uuid references machines (id),
  brand_id text references brands (id),
  photo_path text,
  note text
);

alter table profiles
  add constraint profiles_active_gym_fk foreign key (active_gym_id) references gyms (id) on delete set null;

-- ───────────────────────── Сила і програми ─────────────────────────
create table strength_estimates (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  exercise_id text not null references exercises (id),
  one_rm_kg numeric(6, 2) not null,
  method one_rm_method not null,
  confidence confidence not null,
  measured_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index strength_estimates_user_ex_idx on strength_estimates (user_id, exercise_id, measured_at desc);

create table programs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null,
  goal goal not null,
  split text not null,             -- 'full_body', 'upper_lower', 'ppl' …
  days_per_week int not null check (days_per_week between 1 and 7),
  weekdays int[] not null default '{}',   -- 1 = понеділок … 7 = неділя
  focus text not null default 'hypertrophy' check (focus in ('strength', 'hypertrophy', 'endurance')),
  experience experience_level not null default 'beginner',
  session_min int not null,
  gym_id uuid references gyms (id) on delete set null,
  start_date date not null,
  deload_every_weeks int not null default 5 check (deload_every_weeks between 4 and 6),
  is_active boolean not null default true,
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create table program_days (
  id uuid primary key default gen_random_uuid(),
  program_id uuid not null references programs (id) on delete cascade,
  day_index int not null,
  template text not null,         -- full_a, upper, push …
  name text not null,
  muscle_focus text[] not null default '{}'
);

create table program_exercises (
  id uuid primary key default gen_random_uuid(),
  program_day_id uuid not null references program_days (id) on delete cascade,
  exercise_id text not null references exercises (id),
  position int not null,
  sets int not null check (sets > 0),
  reps_min int not null,
  reps_max int not null,
  pct_1rm numeric(3, 2),
  rest_sec int not null,
  target_rpe numeric(3, 1)
);

create table workouts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  date date not null,
  program_day_id uuid references program_days (id) on delete set null,
  name text,
  status workout_status not null default 'planned',
  started_at timestamptz,
  finished_at timestamptz,
  notes text,
  wellbeing int check (wellbeing between 1 and 5),
  duration_min int,
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);
create index workouts_user_date_idx on workouts (user_id, date);

create table workout_sets (
  id uuid primary key default gen_random_uuid(),
  workout_id uuid not null references workouts (id) on delete cascade,
  exercise_id text not null references exercises (id),
  position int not null default 0, -- порядок вправи в тренуванні
  set_index int not null,
  weight_kg numeric(6, 2) not null default 0,
  reps int not null check (reps >= 0),
  rpe numeric(3, 1) check (rpe between 1 and 10),
  is_warmup boolean not null default false,
  updated_at timestamptz not null default now()
);

create table reminders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  type text not null check (type in ('water', 'meal', 'workout', 'weigh_in')),
  time_of_day time not null,
  weekdays int[] not null default '{1,2,3,4,5,6,7}',
  enabled boolean not null default true,
  updated_at timestamptz not null default now()
);

-- updated_at тригери
do $$
declare t text;
begin
  foreach t in array array[
    'profiles', 'weight_entries', 'nutrition_targets', 'body_measurements', 'progress_photos',
    'foods', 'recipes', 'meal_entries', 'water_entries', 'gyms', 'strength_estimates',
    'programs', 'workouts', 'workout_sets', 'reminders'
  ] loop
    execute format(
      'create trigger %I before update on %I for each row execute function set_updated_at()',
      t || '_updated_at', t
    );
  end loop;
end $$;

-- ───────────────────────── RLS ─────────────────────────
-- 1) Довідники: лише читання для автентифікованих
do $$
declare t text;
begin
  foreach t in array array['muscles', 'equipment_types', 'brands', 'machine_types', 'machines', 'exercises'] loop
    execute format('alter table %I enable row level security', t);
    execute format('create policy %I on %I for select to authenticated using (true)', t || '_read', t);
  end loop;
end $$;

-- 2) Таблиці з user_id: тільки власні рядки
do $$
declare t text;
begin
  foreach t in array array[
    'weight_entries', 'nutrition_targets', 'body_measurements', 'progress_photos', 'recipes',
    'meal_entries', 'meal_photo_analyses', 'water_entries', 'strength_estimates', 'programs',
    'workouts', 'reminders'
  ] loop
    execute format('alter table %I enable row level security', t);
    execute format(
      'create policy %I on %I for all to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()))',
      t || '_own', t
    );
  end loop;
end $$;

-- 3) Профіль: id = auth.uid()
alter table profiles enable row level security;
create policy profiles_own on profiles for all to authenticated
  using (id = (select auth.uid())) with check (id = (select auth.uid()));

-- 4) Продукти та зали: загальні (owner_id is null) — читати всім; власні — повний доступ
alter table foods enable row level security;
create policy foods_read on foods for select to authenticated
  using (owner_id is null or owner_id = (select auth.uid()));
create policy foods_write_own on foods for insert to authenticated
  with check (owner_id = (select auth.uid()));
create policy foods_update_own on foods for update to authenticated
  using (owner_id = (select auth.uid())) with check (owner_id = (select auth.uid()));
create policy foods_delete_own on foods for delete to authenticated
  using (owner_id = (select auth.uid()));

alter table gyms enable row level security;
create policy gyms_read on gyms for select to authenticated
  using (owner_id is null or owner_id = (select auth.uid()));
create policy gyms_write_own on gyms for insert to authenticated
  with check (owner_id = (select auth.uid()));
create policy gyms_update_own on gyms for update to authenticated
  using (owner_id = (select auth.uid())) with check (owner_id = (select auth.uid()));
create policy gyms_delete_own on gyms for delete to authenticated
  using (owner_id = (select auth.uid()));

-- 5) Дочірні таблиці: доступ через батьківський запис
alter table food_portions enable row level security;
create policy food_portions_read on food_portions for select to authenticated
  using (exists (select 1 from foods f where f.id = food_id
                 and (f.owner_id is null or f.owner_id = (select auth.uid()))));
create policy food_portions_write on food_portions for all to authenticated
  using (exists (select 1 from foods f where f.id = food_id and f.owner_id = (select auth.uid())))
  with check (exists (select 1 from foods f where f.id = food_id and f.owner_id = (select auth.uid())));

alter table recipe_ingredients enable row level security;
create policy recipe_ingredients_own on recipe_ingredients for all to authenticated
  using (exists (select 1 from recipes r where r.id = recipe_id and r.user_id = (select auth.uid())))
  with check (exists (select 1 from recipes r where r.id = recipe_id and r.user_id = (select auth.uid())));

alter table gym_equipment enable row level security;
create policy gym_equipment_read on gym_equipment for select to authenticated
  using (exists (select 1 from gyms g where g.id = gym_id
                 and (g.owner_id is null or g.owner_id = (select auth.uid()))));
create policy gym_equipment_write on gym_equipment for all to authenticated
  using (exists (select 1 from gyms g where g.id = gym_id and g.owner_id = (select auth.uid())))
  with check (exists (select 1 from gyms g where g.id = gym_id and g.owner_id = (select auth.uid())));

alter table program_days enable row level security;
create policy program_days_own on program_days for all to authenticated
  using (exists (select 1 from programs p where p.id = program_id and p.user_id = (select auth.uid())))
  with check (exists (select 1 from programs p where p.id = program_id and p.user_id = (select auth.uid())));

alter table program_exercises enable row level security;
create policy program_exercises_own on program_exercises for all to authenticated
  using (exists (select 1 from program_days d join programs p on p.id = d.program_id
                 where d.id = program_day_id and p.user_id = (select auth.uid())))
  with check (exists (select 1 from program_days d join programs p on p.id = d.program_id
                      where d.id = program_day_id and p.user_id = (select auth.uid())));

alter table workout_sets enable row level security;
create policy workout_sets_own on workout_sets for all to authenticated
  using (exists (select 1 from workouts w where w.id = workout_id and w.user_id = (select auth.uid())))
  with check (exists (select 1 from workouts w where w.id = workout_id and w.user_id = (select auth.uid())));

-- ───────────────────────── Storage ─────────────────────────
-- Приватні бакети; файл лежить у теці {user_id}/…
insert into storage.buckets (id, name, public)
values ('meal-photos', 'meal-photos', false),
       ('progress-photos', 'progress-photos', false),
       ('gym-photos', 'gym-photos', false)
on conflict (id) do nothing;

create policy storage_own_read on storage.objects for select to authenticated
  using (bucket_id in ('meal-photos', 'progress-photos', 'gym-photos')
         and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy storage_own_insert on storage.objects for insert to authenticated
  with check (bucket_id in ('meal-photos', 'progress-photos', 'gym-photos')
              and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy storage_own_update on storage.objects for update to authenticated
  using (bucket_id in ('meal-photos', 'progress-photos', 'gym-photos')
         and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy storage_own_delete on storage.objects for delete to authenticated
  using (bucket_id in ('meal-photos', 'progress-photos', 'gym-photos')
         and (storage.foldername(name))[1] = (select auth.uid())::text);
