import type { Goal } from '@/features/onboarding/logic/nutrition';
import type { ExperienceLevel } from '@/features/strength/logic/oneRm';

import type { TrainingZone } from './logic/progression';

export type DayTemplate = 'full_a' | 'full_b' | 'upper' | 'lower' | 'push' | 'pull' | 'legs';
export type Split = 'full_body' | 'upper_lower' | 'ppl' | 'ppl_ul';

export interface ProgramExercise {
  id: string;
  exerciseId: string;
  sets: number;
  repsMin: number;
  repsMax: number;
  /** Частка від 1ПМ; немає — для вправ з власною вагою */
  pct1rm?: number;
  restSec: number;
  targetRpe: number;
}

export interface ProgramDay {
  id: string;
  dayIndex: number;
  template: DayTemplate;
  name: string;
  /** Групи м'язів дня — для кольорів у календарі */
  muscleFocus: string[];
  exercises: ProgramExercise[];
}

export interface Program {
  id: string;
  name: string;
  goal: Goal;
  focus: TrainingZone;
  experience: ExperienceLevel;
  split: Split;
  daysPerWeek: number;
  /** 1 = понеділок … 7 = неділя */
  weekdays: number[];
  sessionMin: number;
  gymId?: string;
  startDate: string;
  deloadEveryWeeks: number;
  days: ProgramDay[];
  updatedAt: string;
}

export interface WorkoutSet {
  id: string;
  exerciseId: string;
  /** Порядок вправи в тренуванні */
  position: number;
  setIndex: number;
  weightKg: number;
  /** Повтори; для вправ на час — секунди */
  reps: number;
  rpe?: number;
}

export interface Workout {
  id: string;
  date: string;
  programDayId?: string;
  name: string;
  startedAt?: string;
  finishedAt?: string;
  durationMin?: number;
  wellbeing?: number;
  notes?: string;
  sets: WorkoutSet[];
  updatedAt: string;
}

/** Підхід під час живого тренування */
export interface LiveSet {
  weightKg?: number;
  reps?: number;
  rpe?: number;
  done: boolean;
}

export interface LiveExercise {
  exerciseId: string;
  repsMin: number;
  repsMax: number;
  restSec: number;
  targetRpe: number;
  /** Звідки підказка ваги: минуле тренування, оцінка 1ПМ або немає */
  weightSource: 'history' | 'estimate' | 'none';
  decision?: 'increase' | 'repeat' | 'decrease';
  sets: LiveSet[];
}

export interface ActiveWorkout {
  id: string;
  date: string;
  programDayId?: string;
  name: string;
  startedAt: string;
  deload: boolean;
  exercises: LiveExercise[];
  /** Мітка часу (мс), коли закінчується відпочинок */
  restEndsAt?: number;
}
