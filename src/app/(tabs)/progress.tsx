import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Image, Pressable, View } from 'react-native';

import { BASE_LIFT_EXERCISE, BASE_LIFTS, getMuscle, MUSCLES } from '@/features/catalog/data';
import { useNutrition } from '@/features/nutrition/store';
import { useProfile } from '@/features/profile/store';
import {
  muscleSets,
  oneRmSeries,
  setBin,
  weeklyReport,
  weeklyTonnage,
  weightSeries,
} from '@/features/progress/logic/stats';
import { MEASUREMENTS, useProgress } from '@/features/progress/store';
import { useStrength } from '@/features/strength/store';
import { dailyWaterMl } from '@/features/water/logic/water';
import { useWater } from '@/features/water/store';
import { scheduledDayIndex, weekOf } from '@/features/workouts/logic/schedule';
import { useWorkouts } from '@/features/workouts/store';
import { addDaysIso, parseIsoDate, todayIso } from '@/lib/dates';
import { formatNumber, formatShortDate } from '@/lib/format';
import { useTheme } from '@/theme/ThemeProvider';
import { Button, EmptyState, IconButton, Screen, Segmented, Text } from '@/ui';
import { BodyHeatmap, ChartCard, ColumnChart, LineChart, MiniLine } from '@/ui/charts';

type Period = '30' | '90' | '365';
const signed = (v: number, digits = 1) =>
  `${v > 0 ? '+' : v < 0 ? '−' : ''}${formatNumber(Math.abs(v), digits)}`;

export default function ProgressScreen() {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const today = todayIso();
  const weights = useProfile((s) => s.weights);
  const targets = useProfile((s) => s.targets);
  const entries = useNutrition((s) => s.entries);
  const water = useWater((s) => s.entries);
  const trainingDays = useWater((s) => s.trainingDays);
  const workouts = useWorkouts((s) => s.workouts);
  const program = useWorkouts((s) => s.program);
  const strengthHistory = useStrength((s) => s.history);
  const measurements = useProgress((s) => s.measurements);
  const photos = useProgress((s) => s.photos);

  const [period, setPeriod] = useState<Period>('90');
  const [weekStart, setWeekStart] = useState(() => weekOf(today)[0]!);

  const weightPts = useMemo(
    () => weightSeries(weights, today, Number(period)),
    [weights, today, period],
  );
  const tonnage = useMemo(() => weeklyTonnage(workouts, today, 8), [workouts, today]);
  const sets = useMemo(() => muscleSets(workouts, weekStart), [workouts, weekStart]);

  if (!weights.length || !targets) {
    return (
      <Screen>
        <EmptyState
          icon="scale-bathroom"
          title={t('progress.emptyTitle')}
          body={t('progress.emptyBody')}
          actionLabel={t('progress.emptyAction')}
          onAction={() => router.navigate('/')}
        />
      </Screen>
    );
  }

  const lastWeight = weights.at(-1)!.weightKg;
  const report = weeklyReport({
    weekStart,
    today,
    entries,
    water,
    waterTargetMl: (d) =>
      dailyWaterMl({
        weightKg: lastWeight,
        isTrainingDay:
          trainingDays.includes(d) ||
          (program ? scheduledDayIndex(program, d) !== null : false) ||
          workouts.some((w) => w.date === d),
      }),
    workouts,
    program,
    weights,
    targets,
  });
  const daysInWeek = Math.min(
    7,
    Math.max(
      1,
      Math.round((parseIsoDate(today).getTime() - parseIsoDate(weekStart).getTime()) / 86400000) +
        1,
    ),
  );
  const shortDate = (iso: string) => formatShortDate(parseIsoDate(iso));

  const tiles = [
    {
      label: t('progress.tiles.kcal'),
      value: report.avgKcal !== null ? formatNumber(report.avgKcal) : '—',
      sub:
        report.avgKcal !== null
          ? t('progress.tiles.kcalOf', { target: formatNumber(report.kcalTarget) })
          : t('progress.tiles.noData'),
    },
    {
      label: t('progress.tiles.protein'),
      value: String(report.proteinDaysHit),
      sub: t('progress.tiles.daysOf', { n: report.proteinDaysHit, total: daysInWeek }),
    },
    {
      label: t('progress.tiles.water'),
      value: String(report.waterDaysHit),
      sub: t('progress.tiles.daysOf', { n: report.waterDaysHit, total: daysInWeek }),
    },
    {
      label: t('progress.tiles.workouts'),
      value: String(report.workoutsDone),
      sub: report.workoutsPlanned
        ? t('progress.tiles.workoutsOf', {
            done: report.workoutsDone,
            planned: report.workoutsPlanned,
          })
        : t('progress.tiles.noPlan'),
    },
    {
      label: t('progress.tiles.tonnage'),
      value: formatNumber(report.tonnageKg),
      sub: t('common.kg'),
    },
    {
      label: t('progress.tiles.weight'),
      value: report.weightChangeKg !== null ? signed(report.weightChangeKg) : '—',
      sub: report.weightChangeKg !== null ? t('common.kg') : t('progress.tiles.noData'),
    },
  ];

  const liftSeries = BASE_LIFTS.map((lift) => ({
    lift,
    points: oneRmSeries(strengthHistory, BASE_LIFT_EXERCISE[lift]),
  })).filter((s) => s.points.length > 0);

  const lastMeasure = measurements.at(-1);
  const firstMeasure = measurements[0];
  const heatRows = MUSCLES.map((m) => ({ id: m.id, sets: sets[m.id] ?? 0 })).sort(
    (a, b) => b.sets - a.sets,
  );

  return (
    <Screen wide>
      <Text variant="title">{t('progress.title')}</Text>

      {/* Тижневий звіт */}
      <View className="gap-3">
        <View className="flex-row items-center gap-1">
          <View className="flex-1">
            <Text variant="heading">{t('progress.report')}</Text>
            <Text variant="caption">{t('progress.week', { date: shortDate(weekStart) })}</Text>
          </View>
          <IconButton
            icon="chevron-left"
            label={t('progress.prevWeek')}
            onPress={() => setWeekStart(addDaysIso(weekStart, -7))}
          />
          <IconButton
            icon="chevron-right"
            label={t('progress.nextWeek')}
            onPress={() => setWeekStart(addDaysIso(weekStart, 7))}
            disabled={addDaysIso(weekStart, 7) > today}
          />
        </View>
        <View className="flex-row flex-wrap gap-2">
          {tiles.map((tile) => (
            <View
              key={tile.label}
              className="min-w-[150px] flex-1 basis-[30%] gap-0.5 rounded-2xl bg-surface p-3"
            >
              <Text variant="caption" numberOfLines={1}>
                {tile.label}
              </Text>
              <Text variant="number">{tile.value}</Text>
              <Text variant="caption">{tile.sub}</Text>
            </View>
          ))}
        </View>
      </View>

      <View className="gap-4 md:flex-row md:flex-wrap">
        <View className="gap-4 md:min-w-[420px] md:flex-1">
          <ChartCard
            title={t('progress.weightChart')}
            subtitle={t('progress.weightSub')}
            table={[...weightPts].reverse().map((p) => ({
              label: shortDate(p.date),
              value: `${formatNumber(p.weightKg, 1)} / ${formatNumber(p.trendKg, 1)} ${t('common.kg')}`,
            }))}
          >
            <Segmented<Period>
              label=""
              value={period}
              onChange={setPeriod}
              options={(['30', '90', '365'] as const).map((p) => ({
                value: p,
                label: t(`progress.period.${p}`),
              }))}
            />
            <LineChart
              xLabels={weightPts.map((p) => shortDate(p.date))}
              formatY={(v) => formatNumber(v, 1)}
              series={[
                {
                  key: 'raw',
                  label: t('progress.weighIns'),
                  color: colors.muted,
                  values: weightPts.map((p) => p.weightKg),
                  dotsOnly: true,
                },
                {
                  key: 'trend',
                  label: t('progress.trend'),
                  color: colors.ink,
                  values: weightPts.map((p) => p.trendKg),
                },
              ]}
            />
          </ChartCard>

          <ChartCard
            title={t('progress.measurements')}
            right={
              <Button
                label={t('progress.addMeasurements')}
                variant="secondary"
                compact
                onPress={() => router.push('/body/measurements')}
              />
            }
            table={
              measurements.length
                ? [...measurements].reverse().flatMap((m) =>
                    MEASUREMENTS.filter((k) => m[k] !== undefined).map((k) => ({
                      label: `${shortDate(m.date)}, ${t(`progress.m.${k}`).toLowerCase()}`,
                      value: `${formatNumber(m[k]!, 1)} ${t('common.cm')}`,
                    })),
                  )
                : undefined
            }
          >
            {lastMeasure ? (
              <View className="flex-row flex-wrap gap-2">
                {MEASUREMENTS.filter((k) => lastMeasure[k] !== undefined).map((k) => {
                  const values = measurements
                    .map((m) => m[k])
                    .filter((v): v is number => v !== undefined);
                  const first = firstMeasure?.[k];
                  return (
                    <MiniLine
                      key={k}
                      title={`${t(`progress.m.${k}`)}, ${t('common.cm')}`}
                      values={values}
                      formatValue={(v) => formatNumber(v, 1)}
                      delta={
                        first !== undefined && values.length > 1
                          ? signed(values.at(-1)! - first)
                          : undefined
                      }
                    />
                  );
                })}
              </View>
            ) : (
              <Text variant="body" className="text-muted">
                {t('progress.noMeasurements')}
              </Text>
            )}
          </ChartCard>

          <ChartCard
            title={t('progress.photos')}
            right={
              <Button
                label={t('progress.openPhotos')}
                variant="secondary"
                compact
                onPress={() => router.push('/body/photos')}
              />
            }
          >
            {photos.length ? (
              <Pressable
                accessibilityRole="link"
                onPress={() => router.push('/body/photos')}
                className="flex-row gap-2"
              >
                {[photos[0]!, photos.at(-1)!]
                  .filter((p, i, arr) => p.localUri && arr.findIndex((x) => x.id === p.id) === i)
                  .map((p) => (
                    <View key={p.id} className="flex-1 gap-1">
                      <Image
                        source={{ uri: p.localUri }}
                        className="aspect-[3/4] w-full rounded-2xl"
                        resizeMode="cover"
                        accessibilityLabel={shortDate(p.date)}
                      />
                      <Text variant="caption">{shortDate(p.date)}</Text>
                    </View>
                  ))}
              </Pressable>
            ) : (
              <Text variant="body" className="text-muted">
                {t('progress.noPhotos')}
              </Text>
            )}
          </ChartCard>
        </View>

        <View className="gap-4 md:min-w-[420px] md:flex-1">
          <ChartCard
            title={t('progress.strength')}
            table={
              liftSeries.length
                ? liftSeries.flatMap((s) =>
                    s.points.map((p) => ({
                      label: `${t(`strength.lifts.${s.lift}`)}, ${shortDate(p.date)}`,
                      value: `${formatNumber(p.value, 1)} ${t('common.kg')}`,
                    })),
                  )
                : undefined
            }
          >
            {liftSeries.length ? (
              <View className="flex-row flex-wrap gap-2">
                {liftSeries.map((s) => (
                  <MiniLine
                    key={s.lift}
                    title={t(`strength.lifts.${s.lift}`)}
                    values={s.points.map((p) => p.value)}
                    formatValue={(v) => `${formatNumber(v, 1)} ${t('common.kg')}`}
                    delta={
                      s.points.length > 1
                        ? signed(s.points.at(-1)!.value - s.points[0]!.value)
                        : undefined
                    }
                  />
                ))}
              </View>
            ) : (
              <Text variant="body" className="text-muted">
                {t('progress.noStrength')}
              </Text>
            )}
          </ChartCard>

          <ChartCard
            title={t('progress.volume')}
            subtitle={t('progress.volumeSub')}
            table={[...tonnage].reverse().map((w) => ({
              label: t('progress.weekOf', { date: shortDate(w.weekStart) }),
              value: `${formatNumber(w.value)} ${t('common.kg')}`,
            }))}
          >
            <ColumnChart
              values={tonnage.map((w) => w.value)}
              xLabels={tonnage.map((w) => String(parseIsoDate(w.weekStart).getDate()))}
              tooltipLabels={tonnage.map((w) =>
                t('progress.weekOf', { date: shortDate(w.weekStart) }),
              )}
              color={colors.ink}
              formatY={(v) => formatNumber(v)}
              // Один формат на всю вісь: якщо є значення від 10 000 — усі поділки компактні
              formatTick={(v) =>
                v === 0
                  ? '0'
                  : Math.max(...tonnage.map((w) => w.value)) >= 10000
                    ? `${formatNumber(v / 1000, 1)}K`
                    : formatNumber(v)
              }
            />
          </ChartCard>

          <ChartCard
            title={t('progress.heatmap')}
            subtitle={t('progress.heatmapSub')}
            table={heatRows.map((r) => ({
              label: getMuscle(r.id)?.name_uk ?? r.id,
              value: t('progress.setsShort', { n: formatNumber(r.sets, 1) }),
            }))}
          >
            <BodyHeatmap
              binOf={(m) => setBin(sets[m] ?? 0)}
              labels={{
                front: t('progress.front'),
                back: t('progress.back'),
                bins: t('progress.bins', { returnObjects: true }) as string[],
              }}
              accessibilityLabel={
                heatRows
                  .filter((r) => r.sets > 0)
                  .map(
                    (r) =>
                      `${getMuscle(r.id)?.name_uk}: ${t('progress.setsShort', { n: formatNumber(r.sets, 1) })}`,
                  )
                  .join(', ') || t('progress.tiles.noData')
              }
            />
          </ChartCard>
        </View>
      </View>
    </Screen>
  );
}
