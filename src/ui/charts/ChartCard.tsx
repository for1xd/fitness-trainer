import { useState, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, View } from 'react-native';

import { Text } from '../Text';

interface Props {
  title: string;
  subtitle?: string;
  /** Права частина заголовка: перемикач періоду тощо */
  right?: ReactNode;
  /** Рядки табличного вигляду (доступ до значень без графіка) */
  table?: { label: string; value: string }[];
  children: ReactNode;
}

/** Картка графіка з перемикачем «Таблицею» — кожне значення доступне без наведення. */
export function ChartCard({ title, subtitle, right, table, children }: Props) {
  const { t } = useTranslation();
  const [asTable, setAsTable] = useState(false);
  return (
    <View className="gap-3 rounded-3xl bg-surface p-4">
      <View className="flex-row items-start gap-2">
        <View className="flex-1">
          <Text variant="heading">{title}</Text>
          {subtitle ? <Text variant="caption">{subtitle}</Text> : null}
        </View>
        {right}
      </View>
      {asTable && table ? (
        <View>
          {table.map((row, i) => (
            <View
              key={`${row.label}-${i}`}
              className={`min-h-10 flex-row items-center ${i ? 'border-t border-line' : ''}`}
            >
              <Text variant="body" className="flex-1">
                {row.label}
              </Text>
              <Text variant="label" style={{ fontVariant: ['tabular-nums'] }}>
                {row.value}
              </Text>
            </View>
          ))}
        </View>
      ) : (
        children
      )}
      {table ? (
        <Pressable
          accessibilityRole="button"
          onPress={() => setAsTable((v) => !v)}
          className="min-h-10 justify-center self-start active:opacity-60"
        >
          <Text variant="caption" className="underline">
            {asTable ? t('charts.showChart') : t('charts.showTable')}
          </Text>
        </Pressable>
      ) : null}
    </View>
  );
}
