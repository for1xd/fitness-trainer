import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';

import { authErrorKey } from '@/features/auth/authErrors';
import { useAuth } from '@/features/auth/store';
import { isSupabaseConfigured, supabase } from '@/lib/supabase';
import { Button, Notice, Screen, Text, TextField } from '@/ui';

type Mode = 'signIn' | 'signUp';

export default function SignInScreen() {
  const { t } = useTranslation();
  const setGuest = useAuth((s) => s.setGuest);
  const [mode, setMode] = useState<Mode>('signIn');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  const submit = async () => {
    if (!supabase) return;
    setLoading(true);
    setError(null);
    setInfo(null);
    const credentials = { email: email.trim(), password };
    const { data, error: authError } =
      mode === 'signIn'
        ? await supabase.auth.signInWithPassword(credentials)
        : await supabase.auth.signUp(credentials);
    setLoading(false);
    if (authError) {
      setError(t(`auth.errors.${authErrorKey(authError)}`));
      return;
    }
    if (mode === 'signUp' && !data.session)
      setInfo(t('auth.checkEmail', { email: credentials.email }));
  };

  const canSubmit = email.includes('@') && password.length >= 8;

  return (
    <Screen
      edges={['top', 'bottom']}
      footer={
        <>
          <Button label={t('auth.guest')} variant="secondary" onPress={() => setGuest(true)} />
          <Text variant="caption" className="text-center">
            {t('auth.guestHint')}
          </Text>
        </>
      }
    >
      <View className="gap-3 pt-10">
        <Text variant="hero" className="text-[44px] leading-[50px]">
          {t('auth.title')}
        </Text>
        <Text variant="body" className="max-w-[440px] text-muted">
          {t('auth.tagline')}
        </Text>
      </View>

      {isSupabaseConfigured ? (
        <View className="gap-4">
          <TextField
            autoCapitalize="none"
            autoCorrect={false}
            label={t('auth.email')}
            value={email}
            onChangeText={setEmail}
            autoComplete="email"
            keyboardType="email-address"
          />
          <TextField
            autoCapitalize="none"
            autoCorrect={false}
            label={t('auth.password')}
            hint={mode === 'signUp' ? t('auth.passwordHint') : undefined}
            value={password}
            onChangeText={setPassword}
            autoComplete={mode === 'signIn' ? 'current-password' : 'new-password'}
            secureTextEntry
          />
          {error ? <Notice tone="warn" text={error} /> : null}
          {info ? <Notice text={info} /> : null}
          <Button
            label={t(mode === 'signIn' ? 'auth.signIn' : 'auth.signUp')}
            onPress={submit}
            loading={loading}
            disabled={!canSubmit}
          />
          <Button
            label={t(mode === 'signIn' ? 'auth.toSignUp' : 'auth.toSignIn')}
            variant="ghost"
            onPress={() => {
              setMode(mode === 'signIn' ? 'signUp' : 'signIn');
              setError(null);
            }}
          />
        </View>
      ) : (
        <Notice text={t('auth.notConfigured')} />
      )}
    </Screen>
  );
}
