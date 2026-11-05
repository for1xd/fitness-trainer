import { getArtifactDownloads } from './artifactHost';

/** Веб: зберегти текстовий файл (в артефакті — через можливість downloads, інакше — посилання). */
export async function saveTextFile(filename: string, text: string, type = 'application/json') {
  const blob = new Blob([text], { type });
  const downloads = await getArtifactDownloads();
  if (downloads) {
    await downloads.save({ filename, data: blob });
    return;
  }
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.rel = 'noopener';
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/** Веб: вибрати текстовий файл; null — якщо скасовано або файл завеликий. */
export function pickTextFile(
  accept: string,
  maxBytes: number,
): Promise<string | null | 'tooLarge'> {
  return new Promise((resolve) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = accept;
    input.onchange = () => {
      const file = input.files?.[0];
      if (!file) return resolve(null);
      if (file.size > maxBytes) return resolve('tooLarge');
      file.text().then(resolve, () => resolve(null));
    };
    input.oncancel = () => resolve(null);
    input.click();
  });
}

export const filesSupported = true;
