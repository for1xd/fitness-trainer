// Генерує supabase/seed.sql з JSON-файлів у supabase/seed/.
// Запуск: npm run seed:build
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const read = (f) => JSON.parse(readFileSync(join(root, 'supabase/seed', f), 'utf8'));
const foods = read('foods.json');
const catalog = read('catalog.json');
const exercises = read('exercises.json');

const q = (v) => (v === null || v === undefined ? 'null' : `'${String(v).replaceAll("'", "''")}'`);

const arr = (a) => (a.length ? `array[${a.map(q).join(', ')}]::text[]` : `'{}'::text[]`);
const num = (v) => (v === null || v === undefined ? 'null' : String(v));

/** insert … values … on conflict (id) do update — щоб seed можна було запускати повторно. */
const upsert = (table, cols, rows, conflict = 'id') => [
  `insert into ${table} (${cols.join(', ')}) values`,
  rows.map((r) => `  (${r.join(', ')})`).join(',\n'),
  `on conflict (${conflict}) do update set ${cols
    .filter((c) => c !== conflict)
    .map((c) => `${c} = excluded.${c}`)
    .join(', ')};`,
  '',
];

const lines = [
  '-- ЗГЕНЕРОВАНО scripts/build-seed.mjs — не редагуй вручну.',
  '-- Значення КБЖВ на 100 г — орієнтовні, за стандартними рецептурами.',
  '',
  'insert into foods (id, slug, source, category, name_uk, kcal_100g, protein_100g, fat_100g, carbs_100g) values',
  foods
    .map(
      (f) =>
        `  (${q(f.id)}, ${q(f.slug)}, ${q(f.source)}, ${q(f.category)}, ${q(f.name_uk)}, ${f.kcal_100g}, ${f.protein_100g}, ${f.fat_100g}, ${f.carbs_100g})`,
    )
    .join(',\n'),
  'on conflict (id) do update set name_uk = excluded.name_uk, category = excluded.category,',
  '  kcal_100g = excluded.kcal_100g, protein_100g = excluded.protein_100g,',
  '  fat_100g = excluded.fat_100g, carbs_100g = excluded.carbs_100g;',
  '',
  'insert into food_portions (id, food_id, label_uk, grams) values',
  foods
    .flatMap((f) =>
      f.portions.map((p) => `  (${q(p.id)}, ${q(f.id)}, ${q(p.label_uk)}, ${p.grams})`),
    )
    .join(',\n'),
  'on conflict (id) do update set label_uk = excluded.label_uk, grams = excluded.grams;',
  '',
  '-- ───────── Довідники тренувань ─────────',
  ...upsert(
    'muscles',
    ['id', 'name_uk', 'name_en', 'region', 'group_id'],
    catalog.muscles.map((m) => [q(m.id), q(m.name_uk), q(m.name_en), q(m.region), q(m.group_id)]),
  ),
  ...upsert(
    'equipment_types',
    ['id', 'name_uk', 'name_en'],
    catalog.equipment_types.map((e) => [q(e.id), q(e.name_uk), q(e.name_en)]),
  ),
  ...upsert('brands', ['id', 'name', 'country'], catalog.brands.map((b) => [q(b.id), q(b.name), q(b.country)])),
  ...upsert(
    'machine_types',
    ['id', 'name_uk', 'name_en', 'equipment_type_id', 'category', 'weight_step_kg'],
    catalog.machine_types.map((m) => [
      q(m.id),
      q(m.name_uk),
      q(m.name_en),
      q(m.equipment_type_id),
      q(m.category),
      num(m.weight_step_kg),
    ]),
  ),
  ...upsert(
    'exercises',
    [
      'id', 'name_uk', 'name_en', 'primary_muscle_id', 'secondary_muscle_ids', 'equipment_type_id',
      'required_equipment', 'mechanics', 'region', 'pattern', 'load_type', 'base_lift', 'base_ratio',
      'difficulty', 'technique_uk', 'mistakes_uk',
    ],
    exercises.map((e) => [
      q(e.id), q(e.name_uk), q(e.name_en), q(e.primary_muscle_id), arr(e.secondary_muscle_ids),
      q(e.equipment_type_id), arr(e.required_equipment), q(e.mechanics), q(e.region), q(e.pattern),
      q(e.load_type), q(e.base_lift), num(e.base_ratio), num(e.difficulty), q(e.technique_uk),
      arr(e.mistakes_uk),
    ]),
  ),
  '-- Готові профілі залів (owner_id = null — доступні всім для читання)',
  ...upsert('gyms', ['id', 'name'], catalog.gym_presets.map((g) => [q(g.id), q(g.name)])),
  `delete from gym_equipment where gym_id in (${catalog.gym_presets.map((g) => q(g.id)).join(', ')});`,
  'insert into gym_equipment (gym_id, machine_type_id) values',
  catalog.gym_presets
    .flatMap((g) => g.equipment.map((m) => `  (${q(g.id)}, ${q(m)})`))
    .join(',\n') + ';',
  '',
];

writeFileSync(join(root, 'supabase/seed.sql'), lines.join('\n'));

// Список українських страв для промпту розпізнавання фото (Edge Function analyze-meal)
const dishes = foods
  .filter((f) => f.source === 'ua_dish')
  .map((f) => ({
    slug: f.slug,
    name: f.name_uk,
    per100: { kcal: f.kcal_100g, proteinG: f.protein_100g, fatG: f.fat_100g, carbsG: f.carbs_100g },
  }));
writeFileSync(
  join(root, 'supabase/functions/_shared/uaDishes.ts'),
  `// ЗГЕНЕРОВАНО scripts/build-seed.mjs — не редагуй вручну.\nimport type { KnownDish } from './mealAnalysis.ts';\n\nexport const UA_DISHES: KnownDish[] = ${JSON.stringify(dishes, null, 1)};\n`,
);
console.log(
  `seed.sql: ${foods.length} продуктів, ${exercises.length} вправ, ${catalog.machine_types.length} типів тренажерів`,
);
