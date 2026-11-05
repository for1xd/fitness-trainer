import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, View } from 'react-native';

import { muscleGroupOf } from '@/features/catalog/data';
import { GroupDots } from '@/features/workouts/components/GroupDots';
import { ProgramDayCard } from '@/features/workouts/components/ProgramDayCard';
import { dayStatus, useStartWorkout } from '@/features/workouts/hooks';
import { monthGrid, weekOf } from '@/features/workouts/logic/schedule';
import { tonnageKg } from '@/features/workouts/logic/summary';
import { useWorkouts } from '@/features/workouts/store';
import { addDaysIso, parseIsoDate, todayIso } from '@/lib/dates';
import { formatLongDate, formatNumber } from '@/lib/format';
import { Button, Header, IconButton, Screen, Segmented, Text } from '@/ui';

const groupsOfWorkout = (w: { sets: { exerciseId: string }[] }) => [
  ...new Set(
    w.sets.map((s) => muscleGroupOf(s.exerciseId)).filter((g): g is NonNullable<typeof g> => !!g),
  ),
];

export default function CalendarScreen() {
  const { t, i18n } = useTranslation();
  const today = todayIso();
  const program = useWorkouts((s) => s.program);
  const workouts = useWorkouts((s) => s.workouts);
  const active = useWorkouts((s) => s.active);
  const start = useStartWorkout();
  const [view, setView] = useState<'month' | 'week'>('month');
  const [selected, setSelected] = useState(today);
  const [cursor, setCursor] = useState(() => ({
    y: Number(today.slice(0, 4)),
    m: Number(today.slice(5, 7)) - 1,
  }));

  const status = (d: string) => dayStatus(program, workouts, d, groupsOfWorkout);
  const grid = useMemo(() => monthGrid(cursor.y, cursor.m), [cursor]);
  const week = weekOf(selected);
  const sel = status(selected);
  const plannedDay = sel.plannedIndex !== null ? program?.days[sel.plannedIndex] : undefined;
  const doneHere = workouts.filter((w) => w.date === selected);

  const monthLabel = (() => {
    try {
      const s = new Intl.DateTimeFormat(i18n.language === 'en' ? 'en-GB' : 'uk-UA', {
        month: 'long',
        year: 'numeric',
      }).format(new Date(cursor.y, cursor.m, 1));
      return s.charAt(0).toUpperCase() + s.slice(1);
    } catch {
      return `${cursor.m + 1}.${cursor.y}`;
    }
  })();

  const shiftMonth = (delta: number) =>
    setCursor(({ y, m }) => {
      const d = new Date(y, m + delta, 1);
      return { y: d.getFullYear(), m: d.getMonth() };
    });

  const Cell = ({ date }: { date: string }) => {
    const st = status(date);
    const isSel = date === selected;
    const done = st.doneWorkoutIds.length > 0;
    const missed = !done && st.plannedIndex !== null && date < today;
    return (
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ selected: isSel }}
        accessibilityLabel={`${formatLongDate(parseIsoDate(date))}${done ? `, ${t('calendar.done')}` : st.plannedIndex !== null ? `, ${t(missed ? 'calendar.missed' : 'calendar.planned')}` : ''}`}
        onPress={() => setSelected(date)}
        className={`min-h-14 flex-1 items-center justify-center gap-1 rounded-xl ${isSel ? 'bg-surface' : 'active:bg-line'}`}
      >
        <View
          className={`h-8 w-8 items-center justify-center rounded-full ${done ? 'bg-ink' : ''} ${date === today && !done ? 'border-2 border-ink' : ''}`}
        >
          <Text
            variant="label"
            className={done ? 'text-inverse' : missed ? 'text-muted line-through' : ''}
          >
            {Number(date.slice(8))}
          </Text>
        </View>
        <View className="h-2">
          {st.groups.length ? <GroupDots groups={st.groups} size={6} /> : null}
        </View>
      </Pressable>
    );
  };

  return (
    <Screen edges={['top', 'bottom']}>
      <Header title={t('calendar.title')} />
      <Segmented
        label=""
        value={view}
        onChange={setView}
        options={[
          { value: 'month', label: t('calendar.month') },
          { value: 'week', label: t('calendar.week') },
        ]}
      />

      {view === 'month' ? (
        <View className="gap-2">
          <View className="flex-row items-center">
            <IconButton
              icon="chevron-left"
              label={t('calendar.prev')}
              onPress={() => shiftMonth(-1)}
            />
            <Text variant="heading" className="flex-1 text-center">
              {monthLabel}
            </Text>
            <IconButton
              icon="chevron-right"
              label={t('calendar.next')}
              onPress={() => shiftMonth(1)}
            />
          </View>
          <View className="flex-row">
            {[1, 2, 3, 4, 5, 6, 7].map((d) => (
              <Text key={d} variant="caption" className="flex-1 text-center">
                {t(`weekdays.${d}` as 'weekdays.1')}
              </Text>
            ))}
          </View>
          {grid.map((row, r) => (
            <View key={r} className="flex-row">
              {row.map((d, c) =>
                d ? <Cell key={d} date={d} /> : <View key={`e${c}`} className="flex-1" />,
              )}
            </View>
          ))}
        </View>
      ) : (
        <View className="gap-2">
          <View className="flex-row items-center">
            <IconButton
              icon="chevron-left"
              label={t('calendar.prevWeek')}
              onPress={() => setSelected(addDaysIso(selected, -7))}
            />
            <View className="flex-1" />
            <IconButton
              icon="chevron-right"
              label={t('calendar.nextWeek')}
              onPress={() => setSelected(addDaysIso(selected, 7))}
            />
          </View>
          <View className="overflow-hidden rounded-card border border-hairline bg-surface">
            {week.map((d, i) => {
              const st = status(d);
              const name = st.doneWorkoutIds.length
                ? workouts.find((w) => w.id === st.doneWorkoutIds[0])?.name
                : st.plannedIndex !== null
                  ? program?.days[st.plannedIndex]?.name
                  : t('calendar.rest');
              return (
                <Pressable
                  key={d}
                  accessibilityRole="button"
                  onPress={() => setSelected(d)}
                  className={`min-h-14 flex-row items-center gap-3 px-4 active:bg-line ${i ? 'border-t border-line' : ''} ${d === selected ? 'bg-raised' : ''}`}
                >
                  <Text variant="label" className="w-10">
                    {t(`weekdays.${i + 1}` as 'weekdays.1')}
                  </Text>
                  <Text variant="caption" className="w-6">
                    {Number(d.slice(8))}
                  </Text>
                  <Text
                    variant="body"
                    className={`flex-1 ${st.plannedIndex === null && !st.doneWorkoutIds.length ? 'text-muted' : ''}`}
                  >
                    {name}
                  </Text>
                  <GroupDots groups={st.groups} />
                  {st.doneWorkoutIds.length ? (
                    <Text variant="caption">{t('calendar.done')}</Text>
                  ) : null}
                </Pressable>
              );
            })}
          </View>
        </View>
      )}

      <View className="gap-3">
        <Text variant="heading">{formatLongDate(parseIsoDate(selected))}</Text>
        {doneHere.map((w) => (
          <Pressable
            key={w.id}
            accessibilityRole="link"
            onPress={() => router.push({ pathname: '/workout/[id]', params: { id: w.id } })}
            className="flex-row items-center gap-3 rounded-card border border-hairline bg-surface p-4 active:opacity-80"
          >
            <GroupDots groups={groupsOfWorkout(w)} size={10} />
            <View className="flex-1">
              <Text variant="label">{w.name}</Text>
              <Text variant="caption">
                {t('workouts.tonnage', { value: formatNumber(tonnageKg(w.sets)) })}
              </Text>
            </View>
            <Text variant="caption">{t('calendar.open')}</Text>
          </Pressable>
        ))}
        {plannedDay && !doneHere.length ? (
          <ProgramDayCard
            eyebrow={t(selected < today ? 'calendar.missed' : 'calendar.planned')}
            name={plannedDay.name}
            muscleFocus={plannedDay.muscleFocus}
            exercises={plannedDay.exercises}
            footer={
              selected <= today && !active ? (
                <Button
                  label={selected === today ? t('workouts.start') : t('calendar.logPast')}
                  onPress={() => start(sel.plannedIndex!, selected)}
                />
              ) : null
            }
          />
        ) : null}
        {!plannedDay && !doneHere.length ? (
          <Text variant="body" className="text-muted">
            {t('calendar.rest')}
          </Text>
        ) : null}
      </View>
    </Screen>
  );
}
