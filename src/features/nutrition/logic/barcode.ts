/** Лише цифри зі штрихкоду (пробіли, дефіси з ручного вводу прибираються). */
export const normalizeBarcode = (raw: string) => raw.replace(/\D/g, '');

/**
 * Перевірка контрольної цифри EAN-8, UPC-A (12), EAN-13 і GTIN-14.
 * Українські товари мають EAN-13 з префіксом 482.
 */
export function isValidBarcode(raw: string): boolean {
  const code = normalizeBarcode(raw);
  if (![8, 12, 13, 14].includes(code.length)) return false;
  const digits = code.split('').map(Number);
  const check = digits.pop()!;
  // Ваги 3 і 1, рахуючи справа наліво від цифри перед контрольною
  const sum = digits.reverse().reduce((s, d, i) => s + d * (i % 2 === 0 ? 3 : 1), 0);
  return (10 - (sum % 10)) % 10 === check;
}

export const isUkrainianBarcode = (raw: string) => {
  const code = normalizeBarcode(raw);
  return code.length === 13 && code.startsWith('482');
};
