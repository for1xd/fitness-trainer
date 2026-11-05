import { randomUUID } from 'expo-crypto';
import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, View } from 'react-native';

import { equipmentSet, useGym } from '@/features/gym/store';
import { useProfile } from '@/features/profile/store';
import type { ExperienceLevel } from '@/features/strength/logic/oneRm';
import { useStrength } from '@/features/strength/store';
import { ProgramDayCard } from '@/features/workouts/components/ProgramDayCard';
import {
  DEFAULT_FOCUS,
  DEFAULT_WEEKDAYS,
  generateProgram,
} from '@/features/workouts/logic/generator';
import type { TrainingZone } from '@/features/workouts/logic/progression';
import { DEFAULT_DELOAD_EVERY_WEEKS } from '@/features/workouts/logic/progression';
import { useWorkouts } from '@/features/workouts/store';
import type { Program } from '@/features/workouts/types';
import { todayIso } from '@/lib/dates';
import { Button, ChoiceCard, Header, Notice, Screen, Segmented, Text } from '@/ui';

const FOCUSES: TrainingZone[] = ['hypertrophy', 'strength', 'endurance'];
const LEVELS: ExperienceLevel[] = ['beginner', 'intermediate', 'advanced'];
const DAYS = ['2', '3', '4', '5', '6'] as const;
const DURATIONS = ['45', '60', '75', '90'] as const;

export default function NewProgramScreen() {
  const { t } = useTranslation();
  const goal = useProfile((s) => s.profile?.goal ?? 'maintain');
  const gym = useGym((s) => s.gym);
  const experienceSaved = useStrength((s) => s.experience);
  const hasEstimates = useStrength((s) => Object.keys(s.estimates).length > 0);
  const current = useWorkouts((s) => s.program);
  const saveProgram = useWorkouts((s) => s.saveProgram);

  const [focus, setFocus] = useState<TrainingZone>(current?.focus ?? DEFAULT_FOCUS[goal]);
  const [experience, setExperience] = useState<ExperienceLevel>(
    current?.experience ?? experienceSaved ?? 'beginner',
  );
  const [days, setDays] = useState<(typeof DAYS)[number]>(
    String(current?.daysPerWeek ?? 3) as (typeof DAYS)[number],
  );
  const [duration, setDuration] = useState<(typeof DURATIONS)[number]>(
    String(current?.sessionMin ?? 60) as (typeof DURATIONS)[number],
  );
  const [weekdays, setWeekdays] = useState<number[]>(
    current?.weekdays ?? DEFAULT_WEEKDAYS[Number(days)]!,
  );

  const daysN = Number(days);
  const generated = useMemo(
    () =>
      generateProgram({
        goal,
        focus,
        experience,
        daysPerWeek: daysN,
        sessionMin: Number(duration),
        equipment: equipmentSet(gym),
      }),
    [goal, focus, experience, daysN, duration, gym],
  );

  const changeDays = (v: (typeof DAYS)[number]) => {
    setDays(v);
    setWeekdays(DEFAULT_WEEKDAYS[Number(v)]!);
  };

  const toggleWeekday = (d: number) =>
    setWeekdays((list) =>
      list.includes(d) ? list.filter((x) => x !== d) : [...list, d].sort((a, b) => a - b),
    );

  const valid = weekdays.length === daysN;

  const save = () => {
    if (!valid) return;
    const program: Program = {
      id: randomUUID(),
      name: t(`splits.${generated.split}`),
      goal,
      focus,
      experience,
      split: generated.split,
      daysPerWeek: daysN,
      weekdays,
      sessionMin: Number(duration),
      gymId: gym?.id,
      startDate: todayIso(),
      deloadEveryWeeks: DEFAULT_DELOAD_EVERY_WEEKS,
      updatedAt: new Date().toISOString(),
      days: generated.days.map((d, dayIndex) => ({
        id: randomUUID(),
        dayIndex,
        template: d.template,
        name: t(`templates.${d.template}`),
        muscleFocus: d.muscleFocus,
        exercises: d.exercises.map((e) => ({ ...e, id: randomUUID() })),
      })),
    };
    saveProgram(program);
    router.back();
  };

  return (
    <Screen
      edges={['top', 'bottom']}
      footer={<Button label={t('programNew.save')} onPress={save} disabled={!valid} />}
    >
      <Header title={t('programNew.title')} />

      <View className="gap-3">
        <Text variant="heading">{t('programNew.focus')}</Text>
        {FOCUSES.map((f) => (
          <ChoiceCard
            key={f}
            title={t(`focus.${f}.title`)}
            description={t(`focus.${f}.desc`)}
            selected={focus === f}
            onPress={() => setFocus(f)}
          />
        ))}
      </View>

      <View className="gap-3">
        <Text variant="heading">{t('programNew.experience')}</Text>
        {LEVELS.map((l) => (
          <ChoiceCard
            key={l}
            title={t(`experience.${l}.title`)}
            description={t(`experience.${l}.desc`)}
            selected={experience === l}
            onPress={() => setExperience(l)}
          />
        ))}
      </View>

      <Segmented
        label={t('programNew.days')}
        value={days}
        onChange={changeDays}
        options={DAYS.map((d) => ({ value: d, label: d }))}
      />

      <View className="gap-2">
        <Text variant="label">{t('programNew.weekdays')}</Text>
        <View className="flex-row gap-2">
          {[1, 2, 3, 4, 5, 6, 7].map((d) => {
            const on = weekdays.includes(d);
            return (
              <Pressable
                key={d}
                accessibilityRole="checkbox"
                accessibilityState={{ checked: on }}
                onPress={() => toggleWeekday(d)}
                className={`h-12 flex-1 items-center justify-center rounded-xl ${on ? 'bg-ink' : 'bg-surface active:bg-line'}`}
              >
                <Text variant="label" className={on ? 'text-inverse' : ''}>
                  {t(`weekdays.${d}` as 'weekdays.1')}
                </Text>
              </Pressable>
            );
          })}
        </View>
        <Text variant="caption" className={valid ? '' : 'text-danger'}>
          {t('programNew.weekdaysHint', { count: daysN })}
        </Text>
      </View>

      <Segmented
        label={t('programNew.duration')}
        value={duration}
        onChange={setDuration}
        options={DURATIONS.map((d) => ({ value: d, label: t('programNew.minutes', { n: d }) }))}
      />

      <View className="gap-2">
        <Text variant="label">{t('programNew.equipment')}</Text>
        <Text variant="body">
          {gym ? t('programNew.gymMine', { name: gym.name }) : t('programNew.gymDefault')}
        </Text>
        <Button
          label={t('programNew.gymSetup')}
          variant="ghost"
          onPress={() => router.push('/gym')}
          className="self-start"
        />
      </View>

      {!hasEstimates ? (
        <View className="gap-2">
          <Notice text={t('programNew.noStrength')} />
          <Button
            label={t('programNew.calibrate')}
            variant="secondary"
            onPress={() => router.push('/strength')}
          />
        </View>
      ) : null}

      <View className="gap-3">
        <Text variant="heading">{t('programNew.preview')}</Text>
        {generated.days.map((d, i) => (
          <ProgramDayCard
            key={`${d.template}-${i}`}
            name={t(`templates.${d.template}`)}
            muscleFocus={d.muscleFocus}
            exercises={d.exercises}
          />
        ))}
      </View>

      {current ? <Notice tone="warn" text={t('programNew.replaceWarn')} /> : null}
    </Screen>
  );
}
