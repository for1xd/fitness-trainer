// Збірка без сервера (немає EXPO_PUBLIC_SUPABASE_URL, напр. артефакт claude.ai):
// клієнт Supabase не створюється (src/lib/supabase.ts), тож бібліотека (~250 КБ) не потрібна.
export function createClient() {
  throw new Error('Supabase is not configured in this build');
}
