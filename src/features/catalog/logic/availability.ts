import type { Exercise } from '../data';

/** Вправа доступна, якщо в залі є все потрібне обладнання. */
export function isAvailable(exercise: Exercise, equipment: ReadonlySet<string>): boolean {
  return exercise.required_equipment.every((id) => equipment.has(id));
}

/**
 * Заміни для вправи: спершу той самий патерн руху, потім той самий основний м'яз.
 * Серед однакових — ближчі за типом обладнання та складністю.
 */
export function alternatives(
  exercise: Exercise,
  all: Exercise[],
  equipment: ReadonlySet<string> | null,
  limit = 6,
): Exercise[] {
  return all
    .filter((e) => e.id !== exercise.id)
    .filter((e) => (equipment ? isAvailable(e, equipment) : true))
    .map((e) => {
      let score = 0;
      if (e.pattern === exercise.pattern) score += 10;
      if (e.primary_muscle_id === exercise.primary_muscle_id) score += 6;
      if (e.mechanics === exercise.mechanics) score += 2;
      if (e.equipment_type_id === exercise.equipment_type_id) score += 1;
      score -= Math.abs(e.difficulty - exercise.difficulty) * 0.5;
      return { e, score };
    })
    .filter((x) => x.score >= 6)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((x) => x.e);
}
