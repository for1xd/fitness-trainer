import { isAvailable } from '@/features/catalog/logic/availability';
import { EXERCISES, getMuscle, type Exercise } from '@/features/catalog/data';
import type { Goal } from '@/features/onboarding/logic/nutrition';
import type { ExperienceLevel } from '@/features/strength/logic/oneRm';

import type { DayTemplate, Split } from '../types';
import { TRAINING_ZONES, type TrainingZone } from './progression';

/** Слоти дня в порядку пріоритету: що далі в списку, то раніше відкидається при короткій сесії. */
export const TEMPLATE_SLOTS: Record<DayTemplate, string[]> = {
  full_a: ['squat', 'h_push', 'h_pull', 'hinge', 'v_push', 'biceps', 'core', 'calf'],
  full_b: ['hinge', 'v_pull', 'lunge', 'h_push', 'side_delt', 'triceps', 'core', 'knee_flex'],
  upper: [
    'h_push',
    'h_pull',
    'v_push',
    'v_pull',
    'chest_iso',
    'side_delt',
    'biceps',
    'triceps',
    'rear_delt',
  ],
  lower: ['squat', 'hinge', 'lunge', 'knee_flex', 'knee_ext', 'calf', 'core', 'hip_ext'],
  push: ['h_push', 'v_push', 'h_push', 'chest_iso', 'side_delt', 'triceps', 'triceps'],
  pull: ['v_pull', 'h_pull', 'h_pull', 'rear_delt', 'biceps', 'biceps', 'traps'],
  legs: ['squat', 'hinge', 'squat', 'knee_flex', 'knee_ext', 'calf', 'core', 'lunge'],
};

export const SPLIT_BY_DAYS: Record<number, { split: Split; days: DayTemplate[] }> = {
  2: { split: 'full_body', days: ['full_a', 'full_b'] },
  3: { split: 'full_body', days: ['full_a', 'full_b', 'full_a'] },
  4: { split: 'upper_lower', days: ['upper', 'lower', 'upper', 'lower'] },
  5: { split: 'ppl_ul', days: ['push', 'pull', 'legs', 'upper', 'lower'] },
  6: { split: 'ppl', days: ['push', 'pull', 'legs', 'push', 'pull', 'legs'] },
};

/** Дні тижня за замовчуванням (1 = пн): з відпочинком між тренуваннями. */
export const DEFAULT_WEEKDAYS: Record<number, number[]> = {
  2: [1, 4],
  3: [1, 3, 5],
  4: [1, 2, 4, 5],
  5: [1, 2, 3, 5, 6],
  6: [1, 2, 3, 4, 5, 6],
};

/** Скільки вправ уміщується в сесію (з розминкою і відпочинком). */
export function maxExercises(sessionMin: number): number {
  if (sessionMin <= 45) return 5;
  if (sessionMin <= 60) return 6;
  if (sessionMin <= 75) return 7;
  return 8;
}

export const DEFAULT_FOCUS: Record<Goal, TrainingZone> = {
  gain: 'hypertrophy',
  maintain: 'hypertrophy',
  lose: 'hypertrophy',
};

export interface GeneratorInput {
  goal: Goal;
  focus: TrainingZone;
  experience: ExperienceLevel;
  daysPerWeek: number;
  sessionMin: number;
  equipment: ReadonlySet<string>;
}

export interface GeneratedExercise {
  exerciseId: string;
  sets: number;
  repsMin: number;
  repsMax: number;
  pct1rm?: number;
  restSec: number;
  targetRpe: number;
}

export interface GeneratedDay {
  template: DayTemplate;
  exercises: GeneratedExercise[];
  muscleFocus: string[];
}

export interface GeneratedProgram {
  split: Split;
  weekdays: number[];
  days: GeneratedDay[];
}

type Role = 'main' | 'secondary' | 'isolation';

const REPS: Record<Role, Record<TrainingZone, [number, number]>> = {
  main: { strength: [4, 6], hypertrophy: [6, 10], endurance: [12, 15] },
  secondary: { strength: [6, 8], hypertrophy: [8, 12], endurance: [12, 15] },
  isolation: { strength: [10, 12], hypertrophy: [10, 15], endurance: [15, 20] },
};

const PCT: Record<Role, Record<TrainingZone, number>> = {
  main: { strength: 0.85, hypertrophy: 0.75, endurance: 0.6 },
  secondary: { strength: 0.75, hypertrophy: 0.7, endurance: 0.6 },
  isolation: { strength: 0.65, hypertrophy: 0.62, endurance: 0.55 },
};

const SETS: Record<Role, Record<ExperienceLevel, number>> = {
  main: { beginner: 3, intermediate: 4, advanced: 4 },
  secondary: { beginner: 3, intermediate: 3, advanced: 4 },
  isolation: { beginner: 2, intermediate: 3, advanced: 3 },
};

/** Параметри підходів для вправи на певній позиції дня. */
export function prescribe(
  exercise: Exercise,
  slotIndex: number,
  focus: TrainingZone,
  experience: ExperienceLevel,
): Omit<GeneratedExercise, 'exerciseId'> {
  const role: Role =
    exercise.mechanics === 'isolation' ? 'isolation' : slotIndex < 2 ? 'main' : 'secondary';
  const zone =
    TRAINING_ZONES[role === 'main' ? focus : focus === 'endurance' ? 'endurance' : 'hypertrophy'];
  const timed = exercise.load_type === 'timed';
  const [repsMin, repsMax] = timed ? [30, 60] : REPS[role][focus];
  const strengthMain = role === 'main' && focus === 'strength' && experience !== 'beginner';
  return {
    sets: SETS[role][experience] + (strengthMain ? 1 : 0),
    repsMin,
    repsMax,
    pct1rm:
      exercise.base_ratio !== null || exercise.load_type === 'barbell'
        ? PCT[role][focus]
        : undefined,
    restSec: role === 'isolation' ? 60 : zone.restSec,
    targetRpe: experience === 'beginner' ? zone.targetRpe - 1 : zone.targetRpe,
  };
}

/**
 * Вибір вправи для патерну: доступна в залі, ще не використана в цей день.
 * `variant` зсуває вибір, щоб повторні дні (верх 1 і верх 2) відрізнялись.
 * Новачкам — спершу простіші вправи.
 */
export function pickExercise(
  pattern: string,
  equipment: ReadonlySet<string>,
  used: ReadonlySet<string>,
  experience: ExperienceLevel,
  variant = 0,
  pool: Exercise[] = EXERCISES,
): Exercise | undefined {
  let candidates = pool.filter(
    (e) => e.pattern === pattern && !used.has(e.id) && isAvailable(e, equipment),
  );
  if (experience === 'beginner') {
    candidates = [...candidates].sort(
      (a, b) => Number(a.difficulty > 2) - Number(b.difficulty > 2),
    );
  }
  if (!candidates.length) return undefined;
  return candidates[variant % candidates.length];
}

export function generateProgram(
  input: GeneratorInput,
  pool: Exercise[] = EXERCISES,
): GeneratedProgram {
  const days = Math.min(6, Math.max(2, Math.round(input.daysPerWeek)));
  const { split, days: templates } = SPLIT_BY_DAYS[days]!;
  const limit = maxExercises(input.sessionMin);
  const seenTemplates = new Map<DayTemplate, number>();

  const generated = templates.map((template) => {
    const variant = seenTemplates.get(template) ?? 0;
    seenTemplates.set(template, variant + 1);
    const used = new Set<string>();
    const exercises: GeneratedExercise[] = [];
    for (const pattern of TEMPLATE_SLOTS[template]) {
      if (exercises.length >= limit) break;
      const exercise = pickExercise(
        pattern,
        input.equipment,
        used,
        input.experience,
        variant,
        pool,
      );
      if (!exercise) continue;
      used.add(exercise.id);
      exercises.push({
        exerciseId: exercise.id,
        ...prescribe(exercise, exercises.length, input.focus, input.experience),
      });
    }
    const muscleFocus = [
      ...new Set(
        exercises
          .map((x) => pool.find((e) => e.id === x.exerciseId))
          .map((e) => (e ? getMuscle(e.primary_muscle_id)?.group_id : undefined))
          .filter((g): g is NonNullable<typeof g> => !!g),
      ),
    ];
    return { template, exercises, muscleFocus };
  });

  return { split, weekdays: DEFAULT_WEEKDAYS[days]!, days: generated };
}
