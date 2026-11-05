import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';

import { BrandIntro } from '@/features/onboarding/components/BrandIntro';
import { draftFromProfile } from '@/features/onboarding/draftFromProfile';
import {
  ACTIVITY_FACTORS,
  calcTargets,
  type ActivityLevel,
  type Goal,
  type Pace,
} from '@/features/onboarding/logic/nutrition';
import { LIMITS, useOnboarding, type OnboardingDraft } from '@/features/onboarding/store';
import { latestWeightKg, useProfile } from '@/features/profile/store';
import { formatNumber } from '@/lib/format';
import { Button, ChoiceCard, NumberField, Screen, Segmented, StepProgress, Text } from '@/ui';

const ACTIVITIES = Object.keys(ACTIVITY_FACTORS) as ActivityLevel[];
const GOALS: Goal[] = ['lose', 'maintain', 'gain'];
const PACES: Pace[] = ['slow', 'normal', 'fast'];

const STEPS = ['about', 'body', 'activity', 'goal'] as const;

const stepValid: Record<(typeof STEPS)[number], (d: OnboardingDraft) => boolean> = {
  about: (d) => d.sex !== undefined && d.ageYears !== undefined,
  body: (d) => d.heightCm !== undefined && d.weightKg !== undefined,
  activity: (d) => d.activity !== undefined,
  goal: (d) => d.goal !== undefined,
};

export default function OnboardingScreen() {
  const { t } = useTranslation();
  const { edit } = useLocalSearchParams<{ edit?: string }>();
  const isEdit = edit === '1';
  const { draft, step, update, setStep, load } = useOnboarding();
  const profile = useProfile((s) => s.profile);
  const weights = useProfile((s) => s.weights);

  // У режимі редагування один раз підставляємо збережені відповіді.
  const loaded = useRef(false);
  useEffect(() => {
    if (isEdit && profile && !loaded.current) {
      loaded.current = true;
      load(draftFromProfile(profile, latestWeightKg(weights)));
    }
  }, [isEdit, profile, weights, load]);

  const current = STEPS[Math.min(step, STEPS.length - 1)] ?? 'about';
  const valid = stepValid[current](draft);
  const isLast = step >= STEPS.length - 1;

  const next = () => (isLast ? router.push('/onboarding/result') : setStep(step + 1));
  const back = () => {
    if (step > 0) setStep(step - 1);
    else if (router.canGoBack()) router.back();
  };

  return (
    <Screen
      edges={['top', 'bottom']}
      footer={
        <View className="flex-row gap-3">
          {step > 0 || isEdit ? (
            <Button
              label={t('common.back')}
              variant="secondary"
              onPress={back}
              className="flex-1"
            />
          ) : null}
          <Button
            label={isLast ? t('onboarding.calculate') : t('common.next')}
            onPress={next}
            disabled={!valid}
            className="flex-[2]"
          />
        </View>
      }
    >
      {!isEdit && step === 0 ? <BrandIntro /> : null}
      <StepProgress current={step + 1} total={STEPS.length} />
      {current === 'about' && <AboutStep draft={draft} update={update} />}
      {current === 'body' && <BodyStep draft={draft} update={update} />}
      {current === 'activity' && (
        <StepShell
          title={t('onboarding.activityStep.title')}
          subtitle={t('onboarding.activityStep.subtitle')}
        >
          {ACTIVITIES.map((a) => (
            <ChoiceCard
              key={a}
              title={t(`onboarding.activity.${a}.title`)}
              description={t(`onboarding.activity.${a}.desc`)}
              selected={draft.activity === a}
              onPress={() => update({ activity: a })}
            />
          ))}
        </StepShell>
      )}
      {current === 'goal' && <GoalStep draft={draft} update={update} />}
    </Screen>
  );
}

interface StepProps {
  draft: OnboardingDraft;
  update: (patch: Partial<OnboardingDraft>) => void;
}

function StepShell({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle: string;
  children: React.ReactNode;
}) {
  return (
    <View className="gap-5">
      <View className="gap-1">
        <Text variant="title">{title}</Text>
        <Text variant="body" className="text-muted">
          {subtitle}
        </Text>
      </View>
      <View className="gap-3">{children}</View>
    </View>
  );
}

function AboutStep({ draft, update }: StepProps) {
  const { t } = useTranslation();
  return (
    <StepShell title={t('onboarding.about.title')} subtitle={t('onboarding.about.subtitle')}>
      <View className="gap-6">
        <Segmented
          label={t('onboarding.sexLabel')}
          value={draft.sex}
          onChange={(sex) => update({ sex })}
          options={[
            { value: 'male', label: t('onboarding.sex.male') },
            { value: 'female', label: t('onboarding.sex.female') },
          ]}
        />
        <NumberField
          label={t('onboarding.age')}
          unit={t('common.years')}
          value={draft.ageYears}
          onChange={(ageYears) => update({ ageYears })}
          fallback={28}
          {...LIMITS.ageYears}
        />
      </View>
    </StepShell>
  );
}

function BodyStep({ draft, update }: StepProps) {
  const { t } = useTranslation();
  return (
    <StepShell title={t('onboarding.body.title')} subtitle={t('onboarding.body.subtitle')}>
      <View className="gap-6">
        <NumberField
          label={t('onboarding.height')}
          unit={t('common.cm')}
          value={draft.heightCm}
          onChange={(heightCm) => update({ heightCm })}
          fallback={draft.sex === 'female' ? 165 : 178}
          {...LIMITS.heightCm}
        />
        <NumberField
          label={t('onboarding.weight')}
          unit={t('common.kg')}
          value={draft.weightKg}
          onChange={(weightKg) => update({ weightKg })}
          fallback={draft.sex === 'female' ? 62 : 78}
          {...LIMITS.weightKg}
        />
      </View>
    </StepShell>
  );
}

function GoalStep({ draft, update }: StepProps) {
  const { t } = useTranslation();
  const { sex, ageYears, heightCm, weightKg, activity, goal } = draft;
  const canEstimate =
    sex && ageYears && heightCm && weightKg && activity && goal && goal !== 'maintain';

  const expected = (pace: Pace) => {
    if (!canEstimate) return undefined;
    const v = calcTargets({
      sex,
      ageYears,
      heightCm,
      weightKg,
      activity,
      goal,
      pace,
    }).expectedWeeklyChangeKg;
    const sign = v > 0 ? '+' : '−';
    return t('onboarding.paceExpected', { value: `${sign}${formatNumber(Math.abs(v), 2)}` });
  };

  return (
    <StepShell title={t('onboarding.goalStep.title')} subtitle={t('onboarding.goalStep.subtitle')}>
      {GOALS.map((g) => (
        <ChoiceCard
          key={g}
          title={t(`onboarding.goal.${g}.title`)}
          description={t(`onboarding.goal.${g}.desc`)}
          selected={goal === g}
          onPress={() => update({ goal: g })}
        />
      ))}
      {goal && goal !== 'maintain' ? (
        <View className="gap-3 pt-3">
          <Text variant="label">{t('onboarding.paceLabel')}</Text>
          {PACES.map((p) => (
            <ChoiceCard
              key={p}
              title={t(`onboarding.pace.${p}`)}
              aside={expected(p)}
              selected={draft.pace === p}
              onPress={() => update({ pace: p })}
            />
          ))}
        </View>
      ) : null}
    </StepShell>
  );
}
