import { brzycki, epley, estimateOneRm, estimateOneRmFromLevel, updateOneRmFromSet } from './oneRm';

describe('формули 1ПМ', () => {
  it('Еплі', () => {
    expect(epley(100, 5)).toBeCloseTo(116.67, 1);
    expect(epley(100, 1)).toBe(100);
  });
  it('Бжицкі', () => {
    expect(brzycki(60, 12)).toBeCloseTo(86.4, 1);
  });
});

describe('estimateOneRm', () => {
  it('до 10 повторень — Еплі, висока впевненість до 5', () => {
    expect(estimateOneRm(100, 5)).toEqual({ oneRmKg: 116.5, method: 'epley', confidence: 'high' });
    expect(estimateOneRm(80, 8)?.confidence).toBe('medium');
  });

  it('11–15 повторень — Бжицкі з низькою впевненістю', () => {
    expect(estimateOneRm(60, 12)).toEqual({ oneRmKg: 86.5, method: 'brzycki', confidence: 'low' });
  });

  it('відхиляє некоректні дані та понад 15 повторень', () => {
    expect(estimateOneRm(60, 16)).toBeNull();
    expect(estimateOneRm(0, 5)).toBeNull();
    expect(estimateOneRm(60, 0)).toBeNull();
    expect(estimateOneRm(60, 2.5)).toBeNull();
  });
});

describe('estimateOneRmFromLevel', () => {
  it('рахує від маси тіла з низькою впевненістю', () => {
    expect(estimateOneRmFromLevel('squat', 'male', 'intermediate', 80)).toEqual({
      oneRmKg: 100,
      method: 'level',
      confidence: 'low',
    });
  });
});

describe('updateOneRmFromSet', () => {
  it('замінює оцінку за рівнем реальним підходом', () => {
    const current = estimateOneRmFromLevel('bench', 'male', 'beginner', 80);
    const next = updateOneRmFromSet(current, { weightKg: 40, reps: 5 });
    expect(next?.method).toBe('epley');
    expect(next?.oneRmKg).toBe(46.5);
  });

  it('оновлює лише при зростанні', () => {
    const current = estimateOneRm(100, 3)!;
    expect(updateOneRmFromSet(current, { weightKg: 60, reps: 5 })).toBe(current);
    expect(updateOneRmFromSet(current, { weightKg: 105, reps: 3 })?.oneRmKg).toBe(115.5);
  });

  it('враховує запас повторень із RPE', () => {
    // 100 × 3 при RPE 8 ≈ 5 повторень до відмови
    expect(updateOneRmFromSet(null, { weightKg: 100, reps: 3, rpe: 8 })?.oneRmKg).toBe(116.5);
  });
});
