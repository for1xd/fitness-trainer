export type AuthErrorKey =
  'invalidCredentials' | 'emailTaken' | 'weakPassword' | 'invalidEmail' | 'network' | 'generic';

/** Перетворює помилку Supabase Auth на ключ зрозумілого повідомлення. */
export function authErrorKey(error: {
  code?: string;
  message?: string;
  status?: number;
}): AuthErrorKey {
  const code = error.code ?? '';
  const message = (error.message ?? '').toLowerCase();
  if (code === 'invalid_credentials' || message.includes('invalid login'))
    return 'invalidCredentials';
  if (
    code === 'user_already_exists' ||
    code === 'email_exists' ||
    message.includes('already registered')
  ) {
    return 'emailTaken';
  }
  if (code === 'weak_password' || message.includes('password should be')) return 'weakPassword';
  if (code === 'email_address_invalid' || message.includes('invalid email')) return 'invalidEmail';
  if (message.includes('network') || message.includes('fetch')) return 'network';
  return 'generic';
}
