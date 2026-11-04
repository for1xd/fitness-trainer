import { MaterialCommunityIcons } from '@expo/vector-icons';
import { router, type Href } from 'expo-router';
import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, View } from 'react-native';

import { muscleGroupOf } from '@/features/catalog/data';
import { GroupDots } from '@/features/workouts/components/GroupDots';
import { ProgramDayCard } from '@/features/workouts/components/ProgramDayCard';
import { dayStatus, useNextPlanned, useStartWorkout } from '@/features/workouts/hooks';
import { isDeloadWeek } from '@/features/workouts/logic/progression';
import { programWeek, weekOf } from '@/features/workouts/logic/schedule';
import { tonnageKg } from '@/features/workouts/logic/summary';
import { useWorkouts } from '@/features/workouts/store';
import { parseIsoDate, todayIso } from '@/lib/dates';
import { formatNumber, formatShortDate } from '@/lib/format';
import { useTheme } from '@/theme/ThemeProvider';
import { Button, EmptyState, Notice, Screen, Text } from '@/ui';

const groupsOfWorkout = (w: { sets: { exerciseId: string }[] }) => [
  ...new Set(
    w.sets.map((s) => muscleGroupOf(s.exerciseId)).filter((g): g is NonNullable<typeof g> => !!g),
  ),
];

export default function WorkoutsScreen() {
  const { t } = useTranslation();
  const today = todayIso();
  const program = useWorkouts((s) => s.program);
  const workouts = useWorkouts((s) => s.workouts);
  const active = useWorkouts((s) => s.active);
  const start = useStartWorkout();
  const next = useNextPlanned(today);

  const todayStatus = dayStatus(program, workouts, today, groupsOfWorkout);
  const week = useMemo(
    () => weekOf(today).map((d) => dayStatus(program, workouts, d, groupsOfWorkout)),
    [program, workouts, today],
  );
  const recent = useMemo(
    () => [...workouts].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 3),
    [workouts],
  );

  const links: {
    label: string;
    icon: 'calendar-month' | 'dumbbell' | 'warehouse' | 'arm-flex' | 'refresh';
    href: Href;
  }[] = [
    { label: t('workouts.calendar'), icon: 'calendar-month', href: '/calendar' },
    { label: t('workouts.catalog'), icon: 'dumbbell', href: '/exercises' },
    { label: t('workouts.gym'), icon: 'warehouse', href: '/gym' },
    { label: t('workouts.strength'), icon: 'arm-flex', href: '/strength' },
  ];

  if (!program) {
    return (
      <Screen>
        <EmptyState
          icon="dumbbell"
          title={t('workouts.emptyTitle')}
          body={t('workouts.emptyBody')}
          actionLabel={t('workouts.create')}
          onAction={() => router.push('/program/new')}
        />
        <Links links={links} />
      </Screen>
    );
  }

  const week_n = programWeek(program.startDate, today);
  const deload = isDeloadWeek(week_n, program.deloadEveryWeeks);
  const plannedDay =
    todayStatus.plannedIndex !== null ? program.days[todayStatus.plannedIndex] : undefined;

  return (
    <Screen>
      <View className="flex-row items-end justify-between">
        <Text variant="title">{t('workouts.title')}</Text>
        <Text variant="caption">{t('workouts.week', { n: week_n })}</Text>
      </View>

      {active ? (
        <View className="gap-3 rounded-3xl bg-surface p-4">
          <Text variant="heading">{active.name}</Text>
          <Button label={t('workouts.continue')} onPress={() => router.push('/workout/live')} />
        </View>
      ) : todayStatus.doneWorkoutIds.length ? (
        <Notice text={t('workouts.doneToday')} />
      ) : plannedDay ? (
        <ProgramDayCard
          eyebrow={t('workouts.todayPlan')}
          name={plannedDay.name}
          muscleFocus={plannedDay.muscleFocus}
          exercises={plannedDay.exercises}
          footer={
            <Button label={t('workouts.start')} onPress={() => start(todayStatus.plannedIndex!)} />
          }
        />
      ) : (
        <View className="gap-1 rounded-3xl bg-surface p-4">
          <Text variant="heading">{t('workouts.restDay')}</Text>
          {next ? (
            <Text variant="caption">
              {t('workouts.next', {
                name: program.days[next.dayIndex]?.name ?? '',
                date: formatShortDate(parseIsoDate(next.date)),
              })}
            </Text>
          ) : null}
        </View>
      )}
      {deload ? <Notice text={t('workouts.deload')} /> : null}

      <WeekStrip week={week} today={today} />

      <View className="gap-3">
        <View className="flex-row items-center justify-between">
          <Text variant="heading">{t('workouts.program')}</Text>
          <Text variant="caption">{t(`splits.${program.split}`)}</Text>
        </View>
        {program.days.map((d, i) => (
          <ProgramDayCard
            key={d.id}
            name={d.name}
            muscleFocus={d.muscleFocus}
            exercises={d.exercises}
            footer={
              active ? null : (
                <Button
                  label={t('workouts.startAny', { name: d.name })}
                  variant="secondary"
                  onPress={() => start(i)}
                />
              )
            }
          />
        ))}
        <Button
          label={t('workouts.newProgram')}
          variant="ghost"
          onPress={() => router.push('/program/new')}
          className="self-start"
        />
      </View>

      {recent.length ? (
        <View className="gap-2">
          <Text variant="heading">{t('workouts.history')}</Text>
          <View className="overflow-hidden rounded-2xl bg-surface">
            {recent.map((w, i) => (
              <Pressable
                key={w.id}
                accessibilityRole="button"
                onPress={() => router.push({ pathname: '/workout/[id]', params: { id: w.id } })}
                className={`min-h-16 flex-row items-center gap-3 px-4 py-2 active:bg-line ${i ? 'border-t border-line' : ''}`}
              >
                <View className="flex-1">
                  <Text variant="body">{w.name}</Text>
                  <Text variant="caption">{formatShortDate(parseIsoDate(w.date))}</Text>
                </View>
                <Text variant="caption">
                  {t('workouts.tonnage', { value: formatNumber(tonnageKg(w.sets)) })}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>
      ) : null}

      <Links links={links} />
    </Screen>
  );
}

function WeekStrip({ week, today }: { week: ReturnType<typeof dayStatus>[]; today: string }) {
  const { t } = useTranslation();
  return (
    <Pressable
      accessibilityRole="link"
      accessibilityLabel={t('workouts.calendar')}
      onPress={() => router.push('/calendar')}
      className="flex-row justify-between rounded-2xl bg-surface px-2 py-3 active:opacity-80"
    >
      {week.map((d, i) => {
        const isToday = d.date === today;
        const done = d.doneWorkoutIds.length > 0;
        return (
          <View key={d.date} className="flex-1 items-center gap-1.5">
            <Text variant="caption">{t(`weekdays.${i + 1}` as 'weekdays.1')}</Text>
            <View
              className={`h-9 w-9 items-center justify-center rounded-full ${isToday ? 'border-2 border-ink' : ''} ${done ? 'bg-ink' : ''}`}
            >
              <Text variant="label" className={done ? 'text-inverse' : ''}>
                {Number(d.date.slice(8))}
              </Text>
            </View>
            <View className="h-2">
              {d.groups.length ? <GroupDots groups={d.groups} size={6} /> : null}
            </View>
          </View>
        );
      })}
    </Pressable>
  );
}

function Links({
  links,
}: {
  links: {
    label: string;
    icon: 'calendar-month' | 'dumbbell' | 'warehouse' | 'arm-flex' | 'refresh';
    href: Href;
  }[];
}) {
  const { colors } = useTheme();
  return (
    <View className="overflow-hidden rounded-2xl bg-surface">
      {links.map((l, i) => (
        <Pressable
          key={l.label}
          accessibilityRole="link"
          onPress={() => router.push(l.href)}
          className={`min-h-14 flex-row items-center gap-3 px-4 active:bg-line ${i ? 'border-t border-line' : ''}`}
        >
          <MaterialCommunityIcons name={l.icon} size={22} color={colors.ink} />
          <Text variant="body" className="flex-1">
            {l.label}
          </Text>
          <MaterialCommunityIcons name="chevron-right" size={20} color={colors.muted} />
        </Pressable>
      ))}
    </View>
  );
}
