// Генерує supabase/seed.sql з JSON-файлів у supabase/seed/.
// Запуск: npm run seed:build
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const foods = JSON.parse(readFileSync(join(root, 'supabase/seed/foods.json'), 'utf8'));

const q = (v) => (v === null || v === undefined ? 'null' : `'${String(v).replaceAll("'", "''")}'`);

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
];

writeFileSync(join(root, 'supabase/seed.sql'), lines.join('\n'));
console.log(`seed.sql: ${foods.length} продуктів`);
