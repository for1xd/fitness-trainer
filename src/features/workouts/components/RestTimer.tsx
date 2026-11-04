import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Vibration, View } from 'react-native';

import { Button, Text } from '@/ui';

interface Props {
  endsAt: number;
  onAdd: (ms: number) => void;
  onSkip: () => void;
}

const format = (sec: number) => `${Math.floor(sec / 60)}:${String(sec % 60).padStart(2, '0')}`;

/** Таймер відпочинку між підходами. Вібрує, коли час вийшов. */
export function RestTimer({ endsAt, onAdd, onSkip }: Props) {
  const { t } = useTranslation();
  const [now, setNow] = useState(() => Date.now());
  const buzzed = useRef(false);

  useEffect(() => {
    buzzed.current = false;
    const id = setInterval(() => setNow(Date.now()), 500);
    return () => clearInterval(id);
  }, [endsAt]);

  const left = Math.max(0, Math.ceil((endsAt - now) / 1000));
  useEffect(() => {
    if (left === 0 && !buzzed.current) {
      buzzed.current = true;
      Vibration.vibrate(400);
    }
  }, [left]);

  return (
    <View
      className="flex-row items-center gap-3 rounded-2xl bg-ink px-4 py-2"
      accessibilityLiveRegion="polite"
    >
      <View className="flex-1">
        <Text variant="caption" className="text-inverse opacity-70">
          {left === 0 ? t('live.restDone') : t('live.rest')}
        </Text>
        <Text variant="number" className="text-[32px] leading-[38px] text-inverse">
          {format(left)}
        </Text>
      </View>
      <Button label={t('live.addRest')} variant="inverse" compact onPress={() => onAdd(30_000)} />
      <Button label={t('live.skipRest')} variant="inverse" compact onPress={onSkip} />
    </View>
  );
}
