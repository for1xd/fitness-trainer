import { authErrorKey } from './authErrors';

describe('authErrorKey', () => {
  it('розпізнає коди Supabase', () => {
    expect(authErrorKey({ code: 'invalid_credentials' })).toBe('invalidCredentials');
    expect(authErrorKey({ code: 'user_already_exists' })).toBe('emailTaken');
    expect(authErrorKey({ code: 'weak_password' })).toBe('weakPassword');
  });
  it('мережеві та невідомі помилки', () => {
    expect(authErrorKey({ message: 'Failed to fetch' })).toBe('network');
    expect(authErrorKey({ message: 'Something odd' })).toBe('generic');
  });
});
