import i18n from 'i18next';

const localeTag = () => (i18n.language === 'en' ? 'en-GB' : 'uk-UA');

export function formatNumber(value: number, maximumFractionDigits = 0): string {
  try {
    return new Intl.NumberFormat(localeTag(), { maximumFractionDigits }).format(value);
  } catch {
    return String(Math.round(value * 10 ** maximumFractionDigits) / 10 ** maximumFractionDigits);
  }
}

export function formatLongDate(date: Date): string {
  try {
    const text = new Intl.DateTimeFormat(localeTag(), {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
    }).format(date);
    return text.charAt(0).toUpperCase() + text.slice(1);
  } catch {
    return date.toDateString();
  }
}

export function formatShortDate(date: Date): string {
  try {
    return new Intl.DateTimeFormat(localeTag(), { day: 'numeric', month: 'short' }).format(date);
  } catch {
    return date.toDateString();
  }
}
