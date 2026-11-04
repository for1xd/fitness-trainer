import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';

import { useAuth } from '@/features/auth/store';
import { calcAgeYears } from '@/features/onboarding/logic/nutrition';
import { useOnboarding } from '@/features/onboarding/store';
import { latestWeightKg, useProfile } from '@/features/profile/store';
import { useSettings, type Language, type ThemePreference } from '@/features/settings/store';
import { confirmAction } from '@/lib/confirm';
import { parseIsoDate } from '@/lib/dates';
import { formatNumber } from '@/lib/format';
import { Button, Screen, Segmented, Text } from '@/ui';

export default function ProfileScreen() {
  const { t } = useTranslation();
  const profile = useProfile((s) => s.profile);
  const weights = useProfile((s) => s.weights);
  const resetProfile = useProfile((s) => s.reset);
  const clearDraft = useOnboarding((s) => s.clear);
  const { theme, language, setTheme, setLanguage } = useSettings();
  const session = useAuth((s) => s.session);
  const signOut = useAuth((s) => s.signOut);

  const deleteLocal = async () => {
    const ok = await confirmAction({
      title: t('profile.deleteTitle'),
      message: t('profile.deleteBody'),
      confirmLabel: t('profile.deleteConfirm'),
      cancelLabel: t('common.cancel'),
      destructive: true,
    });
    if (!ok) return;
    resetProfile();
    clearDraft();
    await signOut();
  };

  const weight = latestWeightKg(weights);

  return (
    <Screen>
      <Text variant="title">{t('profile.title')}</Text>

      {profile ? (
        <View className="gap-3 rounded-3xl bg-surface p-4">
          <Text variant="heading">{t('profile.params')}</Text>
          <Text variant="body">
            {t('profile.summary', {
              sex: t(`onboarding.sex.${profile.sex}`),
              age: calcAgeYears(parseIsoDate(profile.birthDate)),
              height: formatNumber(profile.heightCm),
              weight: weight !== undefined ? formatNumber(weight, 1) : '—',
            })}
          </Text>
          <Text variant="caption">
            {t(`onboarding.goal.${profile.goal}.title`)},{' '}
            {t(`onboarding.activity.${profile.activity}.title`).toLowerCase()}
          </Text>
          <Button
            label={t('profile.edit')}
            variant="secondary"
            onPress={() => router.push('/onboarding?edit=1')}
          />
        </View>
      ) : null}

      <Segmented<ThemePreference>
        label={t('profile.theme')}
        value={theme}
        onChange={setTheme}
        options={(['system', 'light', 'dark'] as const).map((v) => ({
          value: v,
          label: t(`profile.themeOptions.${v}`),
        }))}
      />

      <Segmented<Language>
        label={t('profile.language')}
        value={language}
        onChange={setLanguage}
        options={[
          { value: 'uk', label: 'Українська' },
          { value: 'en', label: 'English' },
        ]}
      />

      <View className="gap-3">
        <Text variant="heading">{t('profile.account')}</Text>
        <Text variant="body" className="text-muted">
          {session?.user.email ?? t('profile.guestMode')}
        </Text>
        {session ? (
          <Button label={t('profile.signOut')} variant="secondary" onPress={() => void signOut()} />
        ) : null}
        <Button
          label={t('profile.deleteLocal')}
          variant="danger"
          onPress={() => void deleteLocal()}
        />
      </View>
    </Screen>
  );
}
