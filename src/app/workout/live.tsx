import { Icon } from '@/ui/icons/Icon';
import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, Switch, TextInput, View } from 'react-native';

import { alternatives } from '@/features/catalog/logic/availability';
import { EXERCISES, getExercise, isWeighted } from '@/features/catalog/data';
import { equipmentSet, useGym } from '@/features/gym/store';
import { useStrength } from '@/features/strength/store';
import { RestTimer } from '@/features/workouts/components/RestTimer';
import { liveExercise } from '@/features/workouts/logic/session';
import { patchSet, useWorkouts } from '@/features/workouts/store';
import type { LiveExercise } from '@/features/workouts/types';
import { confirmAction } from '@/lib/confirm';
import { formatNumber } from '@/lib/format';
import { useTheme } from '@/theme/ThemeProvider';
import {
  Button,
  CompactNumberInput,
  Header,
  IconButton,
  Notice,
  Screen,
  Segmented,
  Text,
} from '@/ui';

const RPE_OPTIONS = ['7', '8', '9', '10'] as const;

export default function LiveWorkoutScreen() {
  const { t } = useTranslation();
  const active = useWorkouts((s) => s.active);
  const program = useWorkouts((s) => s.program);
  const { updateActive, finishWorkout, discardActive, replaceProgramExercise } =
    useWorkouts.getState();
  const [index, setIndex] = useState(0);
  const [swapOpen, setSwapOpen] = useState(false);
  const [swapForever, setSwapForever] = useState(false);
  const [finishing, setFinishing] = useState(false);
  const [wellbeing, setWellbeing] = useState<string>('4');
  const [notes, setNotes] = useState('');
  const [error, setError] = useState<string | null>(null);
  const gym = useGym((s) => s.gym);
  const equipment = useMemo(() => equipmentSet(gym), [gym]);
  const { colors } = useTheme();

  if (!active) {
    return (
      <Screen edges={['top', 'bottom']}>
        <Header title={t('workouts.title')} onBack={() => router.replace('/workouts')} />
      </Screen>
    );
  }

  const total = active.exercises.length;
  const i = Math.min(index, total - 1);
  const ex = active.exercises[i]!;
  const exercise = getExercise(ex.exerciseId);
  const weighted = exercise ? isWeighted(exercise.load_type) : true;
  const timed = exercise?.load_type === 'timed';
  const plannedWeight = ex.sets.find((s) => s.weightKg !== undefined)?.weightKg;

  const completeSet = (setIdx: number) => {
    const s = ex.sets[setIdx]!;
    if (s.done) {
      updateActive((w) => patchSet(w, i, setIdx, { done: false, rpe: undefined }));
      return;
    }
    const isLastOverall = i === total - 1 && setIdx === ex.sets.length - 1;
    updateActive((w) => ({
      ...patchSet(w, i, setIdx, {
        done: true,
        reps: s.reps ?? ex.repsMax,
        weightKg: weighted ? (s.weightKg ?? plannedWeight) : undefined,
      }),
      restEndsAt: isLastOverall ? undefined : Date.now() + ex.restSec * 1000,
    }));
  };

  const addSet = () =>
    updateActive((w) => ({
      ...w,
      exercises: w.exercises.map((e, k) =>
        k === i
          ? { ...e, sets: [...e.sets, { weightKg: e.sets.at(-1)?.weightKg, done: false }] }
          : e,
      ),
    }));

  const swap = (exerciseId: string) => {
    const replacement: LiveExercise = liveExercise(
      {
        ...ex,
        exerciseId,
        sets: ex.sets.length,
        pct1rm: exercise?.mechanics === 'isolation' ? 0.62 : 0.7,
      },
      useWorkouts.getState().workouts,
      useStrength.getState().estimates,
      false,
    );
    updateActive((w) => ({
      ...w,
      exercises: w.exercises.map((e, k) => (k === i ? replacement : e)),
    }));
    if (swapForever && program && active.programDayId) {
      const day = program.days.find((d) => d.id === active.programDayId);
      const planned = day?.exercises.find((p) => p.exerciseId === ex.exerciseId);
      if (day && planned) replaceProgramExercise(day.id, planned.id, exerciseId);
    }
    setSwapOpen(false);
  };

  const finish = () => {
    const anyDone = active.exercises.some((e) => e.sets.some((s) => s.done));
    if (!anyDone) {
      setError(t('live.noSets'));
      return;
    }
    const result = finishWorkout({ wellbeing: Number(wellbeing), notes });
    if (!result) return;
    const names = result.improvedExerciseIds.map((id) => getExercise(id)?.name_uk ?? id).join(', ');
    router.replace({
      pathname: '/workout/[id]',
      params: {
        id: result.workout.id,
        message: [
          t('live.saved', {
            tonnage: formatNumber(result.tonnageKg),
            min: result.workout.durationMin ?? 0,
          }),
          names ? t('live.improved', { names }) : '',
        ]
          .filter(Boolean)
          .join(' '),
      },
    });
  };

  const discard = async () => {
    const ok = await confirmAction({
      title: t('live.discardTitle'),
      message: t('live.discardBody'),
      confirmLabel: t('live.discard'),
      cancelLabel: t('common.cancel'),
      destructive: true,
    });
    if (!ok) return;
    discardActive();
    router.replace('/workouts');
  };

  if (finishing) {
    return (
      <Screen
        edges={['top', 'bottom']}
        footer={
          <>
            <Button label={t('live.save')} onPress={finish} />
            <Button label={t('live.discard')} variant="danger" onPress={() => void discard()} />
          </>
        }
      >
        <Header title={active.name} onBack={() => setFinishing(false)} />
        <Segmented
          label={t('live.finishTitle')}
          value={wellbeing}
          onChange={setWellbeing}
          options={['1', '2', '3', '4', '5'].map((v) => ({ value: v, label: v }))}
        />
        <Text variant="caption" className="-mt-4">
          {t(`live.wellbeing.${wellbeing}` as 'live.wellbeing.1')}
        </Text>
        <View className="gap-2">
          <Text variant="label">{t('live.notes')}</Text>
          <TextInput
            accessibilityLabel={t('live.notes')}
            value={notes}
            onChangeText={setNotes}
            maxLength={1000}
            placeholder={t('live.notesPlaceholder')}
            placeholderTextColor={colors.muted}
            multiline
            className="min-h-24 rounded-2xl border-2 border-line bg-raised p-4 font-body text-base text-ink"
          />
        </View>
        {error ? <Notice tone="warn" text={error} /> : null}
      </Screen>
    );
  }

  const hint = ex.weightSource === 'history' ? (ex.decision ?? 'repeat') : ex.weightSource;

  return (
    <Screen
      edges={['top', 'bottom']}
      footer={
        <>
          {active.restEndsAt ? (
            <RestTimer
              endsAt={active.restEndsAt}
              onAdd={(ms) =>
                updateActive((w) => ({ ...w, restEndsAt: (w.restEndsAt ?? Date.now()) + ms }))
              }
              onSkip={() => updateActive((w) => ({ ...w, restEndsAt: undefined }))}
            />
          ) : null}
          <View className="flex-row gap-3">
            <Button
              label={t('live.prev')}
              variant="secondary"
              disabled={i === 0}
              compact
              onPress={() => setIndex(i - 1)}
              className="flex-1"
            />
            {i < total - 1 ? (
              <Button label={t('live.next')} onPress={() => setIndex(i + 1)} className="flex-[2]" />
            ) : (
              <Button
                label={t('live.finish')}
                onPress={() => setFinishing(true)}
                className="flex-[2]"
              />
            )}
          </View>
        </>
      }
    >
      <Header
        title={active.name}
        onBack={() => router.replace('/workouts')}
        right={
          <IconButton
            icon="flag-checkered"
            label={t('live.finish')}
            onPress={() => setFinishing(true)}
          />
        }
      />

      <View className="gap-1">
        <Text variant="caption">{t('live.exerciseOf', { n: i + 1, total })}</Text>
        <Pressable
          accessibilityRole="link"
          onPress={() =>
            router.push({ pathname: '/exercises/[id]', params: { id: ex.exerciseId } })
          }
          className="flex-row items-center gap-2 active:opacity-60"
        >
          <Text variant="title" className="flex-1">
            {exercise?.name_uk ?? ex.exerciseId}
          </Text>
          <Icon name="information-outline" size={22} color={colors.muted} />
        </Pressable>
        <Text variant="label" className="text-muted">
          {timed
            ? t('live.targetSecs', { sets: ex.sets.length, min: ex.repsMin, max: ex.repsMax })
            : t('live.target', {
                sets: ex.sets.length,
                min: ex.repsMin,
                max: ex.repsMax,
                rpe: ex.targetRpe,
              })}
        </Text>
        {weighted ? <Text variant="caption">{t(`live.hint.${hint}`)}</Text> : null}
      </View>

      {active.deload ? <Notice text={t('workouts.deload')} /> : null}

      <View className="gap-2">
        <View className="flex-row items-center gap-3 px-1">
          <Text variant="caption" className="w-8">
            #
          </Text>
          {weighted ? (
            <Text variant="caption" className="w-[92px] text-center">
              {t('live.kg')}
            </Text>
          ) : null}
          <Text variant="caption" className="w-[76px] text-center">
            {timed ? t('live.secs') : t('live.reps')}
          </Text>
        </View>
        {ex.sets.map((s, k) => (
          <View key={k} className={`gap-2 rounded-2xl px-1 py-1.5 ${s.done ? 'bg-surface' : ''}`}>
            <View className="flex-row items-center gap-3">
              <Text variant="label" className="w-8 text-center">
                {k + 1}
              </Text>
              {weighted ? (
                <CompactNumberInput
                  label={t('live.weightOf', { n: k + 1 })}
                  value={s.weightKg}
                  onChange={(v) => updateActive((w) => patchSet(w, i, k, { weightKg: v }))}
                  placeholder={plannedWeight !== undefined ? String(plannedWeight) : '—'}
                  decimal
                  width={92}
                />
              ) : null}
              <CompactNumberInput
                label={t('live.repsOf', { n: k + 1 })}
                value={s.reps}
                onChange={(v) => updateActive((w) => patchSet(w, i, k, { reps: v }))}
                placeholder={String(ex.repsMax)}
              />
              <View className="flex-1" />
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={
                  s.done ? t('live.undoSet', { n: k + 1 }) : t('live.doneSet', { n: k + 1 })
                }
                accessibilityState={{ checked: s.done }}
                onPress={() => completeSet(k)}
                className={`h-14 w-14 items-center justify-center rounded-2xl ${s.done ? 'bg-ink' : 'border-2 border-ink active:bg-line'}`}
              >
                <Icon name="check" size={28} color={s.done ? colors.inverse : colors.ink} />
              </Pressable>
            </View>
            {s.done && !timed ? (
              <View className="flex-row items-center gap-2 pl-11">
                <Text variant="caption" className="mr-1">
                  {t('live.rpeShort')}
                </Text>
                {RPE_OPTIONS.map((r) => {
                  const on = s.rpe === Number(r);
                  return (
                    <Pressable
                      key={r}
                      accessibilityRole="radio"
                      accessibilityLabel={`${t('live.rpe')}: ${r}`}
                      accessibilityState={{ checked: on }}
                      aria-checked={on}
                      onPress={() =>
                        updateActive((w) => patchSet(w, i, k, { rpe: on ? undefined : Number(r) }))
                      }
                      className={`h-10 w-12 items-center justify-center rounded-xl ${on ? 'bg-ink' : 'bg-bg active:bg-line'}`}
                    >
                      <Text variant="label" className={on ? 'text-inverse' : ''}>
                        {r}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            ) : null}
          </View>
        ))}
        <Text variant="caption">{t('live.rpeHint')}</Text>
      </View>

      <View className="flex-row flex-wrap gap-2">
        <Button label={t('live.addSet')} variant="secondary" compact onPress={addSet} />
        <Button
          label={t('live.swap')}
          variant="secondary"
          compact
          onPress={() => setSwapOpen((v) => !v)}
        />
      </View>

      {swapOpen && exercise ? (
        <View className="gap-2">
          <Text variant="heading">{t('live.swapTitle')}</Text>
          <View className="overflow-hidden rounded-card border border-hairline bg-surface">
            {alternatives(exercise, EXERCISES, equipment).map((a, k) => (
              <Pressable
                key={a.id}
                accessibilityRole="button"
                onPress={() => swap(a.id)}
                className={`min-h-14 justify-center px-4 py-2 active:bg-line ${k ? 'border-t border-line' : ''}`}
              >
                <Text variant="body">{a.name_uk}</Text>
              </Pressable>
            ))}
          </View>
          <View className="flex-row items-center gap-3">
            <Text variant="label" className="flex-1">
              {t('live.swapForever')}
            </Text>
            <Switch
              accessibilityLabel={t('live.swapForever')}
              value={swapForever}
              onValueChange={setSwapForever}
              trackColor={{ true: colors.ink, false: colors.line }}
              thumbColor={colors.raised}
            />
          </View>
        </View>
      ) : null}
    </Screen>
  );
}
