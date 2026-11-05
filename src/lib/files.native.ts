/** На телефоні експорт/імпорт файлом з'явиться разом із системним меню «Поділитися». */
export async function saveTextFile(
  _filename: string,
  _text: string,
  _type?: string,
): Promise<void> {
  throw new Error('not_supported');
}

export function pickTextFile(
  _accept: string,
  _maxBytes: number,
): Promise<string | null | 'tooLarge'> {
  return Promise.resolve(null);
}

export const filesSupported = false;
