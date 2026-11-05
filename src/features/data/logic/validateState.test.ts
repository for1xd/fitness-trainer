import { isValidStoreState, LIMITS } from './validateState';

const initial = { entries: [] as unknown[], profile: null, theme: 'system', add: () => undefined };

describe('isValidStoreState', () => {
  it('приймає коректний стан', () => {
    expect(
      isValidStoreState(
        { entries: [{ id: 'a', ml: 250 }], profile: { sex: 'male' }, theme: 'dark' },
        initial,
      ),
    ).toBe(true);
  });

  it('відхиляє невідоме поле і функції', () => {
    expect(isValidStoreState({ hacked: 1 }, initial)).toBe(false);
    expect(isValidStoreState({ add: 'x' }, initial)).toBe(false);
  });

  it('відхиляє інший тип поля', () => {
    expect(isValidStoreState({ entries: 'oops' }, initial)).toBe(false);
    expect(isValidStoreState({ theme: 5 }, initial)).toBe(false);
  });

  it('відхиляє __proto__, нескінченні числа і задовгі рядки', () => {
    expect(isValidStoreState(JSON.parse('{"profile":{"__proto__":{"x":1}}}'), initial)).toBe(false);
    expect(isValidStoreState({ entries: [{ ml: Infinity }] }, initial)).toBe(false);
    expect(isValidStoreState({ theme: 'x'.repeat(LIMITS.string + 1) }, initial)).toBe(false);
  });

  it('довгий рядок дозволено лише як data URI зображення', () => {
    const img = 'data:image/jpeg;base64,' + 'A'.repeat(5000);
    expect(isValidStoreState({ entries: [{ localUri: img }] }, initial)).toBe(true);
    const html = 'data:text/html;base64,' + 'A'.repeat(5000);
    expect(isValidStoreState({ entries: [{ localUri: html }] }, initial)).toBe(false);
  });

  it('обмежує глибину вкладення', () => {
    let deep: unknown = 1;
    for (let i = 0; i < LIMITS.depth + 2; i++) deep = { d: deep };
    expect(isValidStoreState({ profile: deep as Record<string, unknown> }, initial)).toBe(false);
  });
});
