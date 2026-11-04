import en from './locales/en.json';
import uk from './locales/uk.json';

const keys = (obj: object, prefix = ''): string[] =>
  Object.entries(obj).flatMap(([k, v]) =>
    v && typeof v === 'object' ? keys(v as object, `${prefix}${k}.`) : [`${prefix}${k}`],
  );

describe('переклади', () => {
  it('англійська містить ті самі ключі, що й українська', () => {
    expect(keys(en).sort()).toEqual(keys(uk).sort());
  });
});
