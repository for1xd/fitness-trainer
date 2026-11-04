/**
 * Розрахунок норм КБЖВ.
 * BMR — формула Міффліна — Сан Жеора, TDEE — BMR × коефіцієнт активності.
 * Не є медичною порадою: це орієнтир для здорових дорослих.
 */

export type Sex = 'male' | 'female';
export type ActivityLevel = 'sedentary' | 'light' | 'moderate' | 'high' | 'very_high';
export type Goal = 'lose' | 'maintain' | 'gain';
export type Pace = 'slow' | 'normal' | 'fast';

export const ACTIVITY_FACTORS: Record<ActivityLevel, number> = {
  sedentary: 1.2,
  light: 1.375,
  moderate: 1.55,
  high: 1.725,
  very_high: 1.9,
};

/** Зміна калорій відносно TDEE: схуднення −10…20 %, набір +5…15 %. */
export const GOAL_ADJUSTMENT: Record<Goal, Record<Pace, number>> = {
  lose: { slow: -0.1, normal: -0.15, fast: -0.2 },
  maintain: { slow: 0, normal: 0, fast: 0 },
  gain: { slow: 0.05, normal: 0.1, fast: 0.15 },
};

/** Безпечний мінімум калорій на день. */
export const MIN_KCAL: Record<Sex, number> = { male: 1500, female: 1200 };

/** Білок, г на кг: 1,6–2,2. Під час дефіциту — більше, щоб зберегти м'язи. */
export const PROTEIN_G_PER_KG: Record<Goal, number> = { lose: 2.0, maintain: 1.8, gain: 1.8 };
export const MIN_FAT_G_PER_KG = 0.8;
/** Бажана частка жирів у калоріях (нижня межа — 0,8 г/кг). */
export const FAT_SHARE_OF_KCAL = 0.25;

export const KCAL_PER_G = { protein: 4, fat: 9, carbs: 4 } as const;
/** Приблизно стільки ккал у 1 кг маси тіла (для оцінки темпу). */
export const KCAL_PER_KG_BODY = 7700;

/** Максимальний безпечний темп, частка ваги на тиждень. */
export const MAX_WEEKLY_LOSS_SHARE = 0.01;
export const MAX_WEEKLY_GAIN_SHARE = 0.005;

export type NutritionWarning =
  'clamped_to_minimum' | 'fast_loss' | 'fast_gain' | 'underweight_loss' | 'minor';

export interface BodyInput {
  sex: Sex;
  ageYears: number;
  heightCm: number;
  weightKg: number;
}

export interface TargetsInput extends BodyInput {
  activity: ActivityLevel;
  goal: Goal;
  pace: Pace;
}

export interface NutritionTargets {
  bmr: number;
  tdee: number;
  kcal: number;
  proteinG: number;
  fatG: number;
  carbsG: number;
  /** Застосована зміна до TDEE, частка (−0,15 = −15 %). */
  adjustment: number;
  /** Очікувана зміна ваги, кг на тиждень (від'ємна — схуднення). */
  expectedWeeklyChangeKg: number;
  warnings: NutritionWarning[];
}

export function calcAgeYears(birthDate: Date, today: Date = new Date()): number {
  let age = today.getFullYear() - birthDate.getFullYear();
  const beforeBirthday =
    today.getMonth() < birthDate.getMonth() ||
    (today.getMonth() === birthDate.getMonth() && today.getDate() < birthDate.getDate());
  if (beforeBirthday) age -= 1;
  return age;
}

export function calcBmi(weightKg: number, heightCm: number): number {
  const m = heightCm / 100;
  return weightKg / (m * m);
}

export function calcBmr({ sex, ageYears, heightCm, weightKg }: BodyInput): number {
  const base = 10 * weightKg + 6.25 * heightCm - 5 * ageYears;
  return sex === 'male' ? base + 5 : base - 161;
}

export function calcTdee(bmr: number, activity: ActivityLevel): number {
  return bmr * ACTIVITY_FACTORS[activity];
}

/**
 * Вага, від якої рахуємо білок і жири. При ІМТ > 27 беремо вагу, що відповідає ІМТ 25,
 * інакше людині зі 130 кг пропонувалося б 260 г білка.
 */
export function macroReferenceWeightKg(weightKg: number, heightCm: number): number {
  if (calcBmi(weightKg, heightCm) <= 27) return weightKg;
  const m = heightCm / 100;
  return 25 * m * m;
}

const roundTo = (value: number, step: number) => Math.round(value / step) * step;

export function calcTargets(input: TargetsInput): NutritionTargets {
  const { sex, weightKg, heightCm, ageYears, activity, goal, pace } = input;
  const warnings: NutritionWarning[] = [];

  const bmr = calcBmr(input);
  const tdee = calcTdee(bmr, activity);
  const adjustment = GOAL_ADJUSTMENT[goal][pace];

  let kcal = tdee * (1 + adjustment);
  if (kcal < MIN_KCAL[sex]) {
    kcal = MIN_KCAL[sex];
    warnings.push('clamped_to_minimum');
  }
  kcal = roundTo(kcal, 10);

  const refKg = macroReferenceWeightKg(weightKg, heightCm);
  const proteinG = Math.round(PROTEIN_G_PER_KG[goal] * refKg);
  const minFatG = MIN_FAT_G_PER_KG * refKg;
  let fatG = Math.max(minFatG, (kcal * FAT_SHARE_OF_KCAL) / KCAL_PER_G.fat);

  let carbKcal = kcal - proteinG * KCAL_PER_G.protein - fatG * KCAL_PER_G.fat;
  if (carbKcal < 0) {
    // Спершу зменшуємо жири до мінімуму, потім вуглеводи не можуть бути від'ємними.
    fatG = Math.max(minFatG, fatG + carbKcal / KCAL_PER_G.fat);
    carbKcal = Math.max(0, kcal - proteinG * KCAL_PER_G.protein - fatG * KCAL_PER_G.fat);
  }

  const expectedWeeklyChangeKg = ((kcal - tdee) * 7) / KCAL_PER_KG_BODY;
  // «Швидкий» темп — завжди з попередженням; інші — якщо перевищують безпечну частку ваги.
  const fast = pace === 'fast';
  if (goal === 'lose' && (fast || expectedWeeklyChangeKg < -MAX_WEEKLY_LOSS_SHARE * weightKg)) {
    warnings.push('fast_loss');
  }
  if (goal === 'gain' && (fast || expectedWeeklyChangeKg > MAX_WEEKLY_GAIN_SHARE * weightKg)) {
    warnings.push('fast_gain');
  }
  if (goal === 'lose' && calcBmi(weightKg, heightCm) < 18.5) warnings.push('underweight_loss');
  if (ageYears < 18) warnings.push('minor');

  return {
    bmr: Math.round(bmr),
    tdee: Math.round(tdee),
    kcal,
    proteinG,
    fatG: Math.round(fatG),
    carbsG: Math.round(carbKcal / KCAL_PER_G.carbs),
    adjustment,
    expectedWeeklyChangeKg: Math.round(expectedWeeklyChangeKg * 100) / 100,
    warnings,
  };
}
