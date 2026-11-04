import catalog from '../../../supabase/seed/catalog.json';
import exercisesJson from '../../../supabase/seed/exercises.json';

export type MuscleGroup = 'chest' | 'back' | 'shoulders' | 'arms' | 'legs' | 'core';
export type LoadType =
  'barbell' | 'dumbbell' | 'kettlebell' | 'machine' | 'cable' | 'bodyweight' | 'assisted' | 'timed';
export type BaseLiftId = 'squat' | 'bench' | 'deadlift' | 'ohp' | 'row' | 'pullup';
export type MachineCategory = 'free' | 'legs' | 'back' | 'chest_shoulders' | 'arms_core';

export interface Muscle {
  id: string;
  name_uk: string;
  name_en: string;
  region: 'upper' | 'lower' | 'core';
  group_id: MuscleGroup;
}

export interface MachineType {
  id: string;
  name_uk: string;
  name_en: string;
  equipment_type_id: string;
  category: MachineCategory;
  weight_step_kg: number;
}

export interface Brand {
  id: string;
  name: string;
  country: string;
}

export interface GymPreset {
  id: string;
  slug: string;
  name: string;
  equipment: string[];
}

export interface Exercise {
  id: string;
  name_uk: string;
  name_en: string;
  primary_muscle_id: string;
  secondary_muscle_ids: string[];
  equipment_type_id: string;
  required_equipment: string[];
  mechanics: 'compound' | 'isolation';
  region: 'upper' | 'lower' | 'core';
  pattern: string;
  load_type: LoadType;
  base_lift: BaseLiftId | null;
  base_ratio: number | null;
  difficulty: number;
  technique_uk: string;
  mistakes_uk: string[];
}

export const MUSCLES = catalog.muscles as Muscle[];
export const MACHINE_TYPES = catalog.machine_types as MachineType[];
export const BRANDS = catalog.brands as Brand[];
export const GYM_PRESETS = catalog.gym_presets as GymPreset[];
/** Порядок у файлі = пріоритет вибору в генераторі (базові вправи — першими). */
export const EXERCISES = exercisesJson as Exercise[];

const exerciseById = new Map(EXERCISES.map((e) => [e.id, e]));
const muscleById = new Map(MUSCLES.map((m) => [m.id, m]));
const machineById = new Map(MACHINE_TYPES.map((m) => [m.id, m]));

export const getExercise = (id: string) => exerciseById.get(id);
export const getMuscle = (id: string) => muscleById.get(id);
export const getMachineType = (id: string) => machineById.get(id);
export const muscleGroupOf = (exerciseId: string): MuscleGroup | undefined => {
  const e = exerciseById.get(exerciseId);
  return e ? muscleById.get(e.primary_muscle_id)?.group_id : undefined;
};

/** Базові вправи силової калібровки. */
export const BASE_LIFT_EXERCISE: Record<BaseLiftId, string> = {
  squat: 'barbell_back_squat',
  bench: 'barbell_bench_press',
  deadlift: 'barbell_deadlift',
  ohp: 'barbell_overhead_press',
  row: 'barbell_bent_over_row',
  pullup: 'pull_up',
};
export const BASE_LIFTS = Object.keys(BASE_LIFT_EXERCISE) as BaseLiftId[];

export const MUSCLE_GROUPS: MuscleGroup[] = ['chest', 'back', 'shoulders', 'arms', 'legs', 'core'];

/** Крок ваги для округлення робочої ваги. */
export const LOAD_INCREMENT_KG: Record<LoadType, number> = {
  barbell: 2.5,
  dumbbell: 2,
  kettlebell: 4,
  machine: 5,
  cable: 2.5,
  bodyweight: 0,
  assisted: 0,
  timed: 0,
};

/** Чи вказується для вправи вага (для власної ваги, гравітрона й планки — ні). */
export const isWeighted = (load: LoadType) =>
  load !== 'bodyweight' && load !== 'assisted' && load !== 'timed';
