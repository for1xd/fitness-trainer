import { Icon } from '@/ui/icons/Icon';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Pressable, View } from 'react-native';

import { calcAgeYears } from '@/features/onboarding/logic/nutrition';
import { latestWeightKg, useProfile } from '@/features/profile/store';
import { useSettings, type Language, type ThemePreference } from '@/features/settings/store';
import { parseIsoDate } from '@/lib/dates';
import { formatNumber } from '@/lib/format';
import { DataSection } from '@/features/data/components/DataSection';
import { useTheme } from '@/theme/ThemeProvider';
import { Button, Screen, Segmented, Text } from '@/ui';

export default function ProfileScreen() {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const profile = useProfile((s) => s.profile);
  const weights = useProfile((s) => s.weights);
  const { theme, language, setTheme, setLanguage } = useSettings();

  const weight = latestWeightKg(weights);

  return (
    <Screen>
      <Text variant="title">{t('profile.title')}</Text>

      {profile ? (
        <View className="gap-3 rounded-card border border-hairline bg-surface p-4">
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

      <View className="overflow-hidden rounded-card border border-hairline bg-surface">
        {(
          [
            ['reminders', '/reminders', 'bell-outline'],
            ['measurements', '/body/measurements', 'tape-measure'],
            ['photos', '/body/photos', 'image-multiple-outline'],
          ] as const
        ).map(([key, href, icon], i) => (
          <Pressable
            key={key}
            accessibilityRole="link"
            onPress={() => router.push(href)}
            className={`min-h-14 flex-row items-center gap-3 px-4 active:bg-line ${i ? 'border-t border-line' : ''}`}
          >
            <Icon name={icon} size={22} color={colors.ink} />
            <Text variant="body" className="flex-1">
              {t(`profileLinks.${key}`)}
            </Text>
            <Icon name="chevron-right" size={20} color={colors.muted} />
          </Pressable>
        ))}
      </View>

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

      <DataSection />

      <Text variant="caption">{t('disclaimer')}</Text>
    </Screen>
  );
}
