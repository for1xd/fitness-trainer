import { Icon } from '@/ui/icons/Icon';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';

import { useSaveStatus } from '@/lib/cloud/storage';
import { useTheme } from '@/theme/ThemeProvider';
import { Text } from '@/ui';

const SHOW_MS = 1600;

/** Невелика плашка «Зберігаю… / Збережено» над таб-баром; зникає сама. */
export function SaveIndicator({ bottom }: { bottom: number }) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const state = useSaveStatus((s) => s.state);
  const savedAt = useSaveStatus((s) => s.savedAt);
  const cloud = useSaveStatus((s) => s.cloud);
  const [hiddenAt, setHiddenAt] = useState<number | null>(null);

  useEffect(() => {
    if (state !== 'saved' || savedAt === null) return;
    const timer = setTimeout(() => setHiddenAt(savedAt), SHOW_MS);
    return () => clearTimeout(timer);
  }, [state, savedAt]);

  const visible =
    state === 'saving' || state === 'error' || (state === 'saved' && hiddenAt !== savedAt);
  if (!visible) return null;

  const label =
    state === 'saving'
      ? t('data.saving')
      : state === 'error'
        ? t('data.saveError')
        : t(cloud === 'account' ? 'data.savedAccount' : 'data.savedDevice');
  const icon = state === 'error' ? 'alert-circle-outline' : state === 'saving' ? 'sync' : 'check';

  return (
    <View
      pointerEvents="none"
      accessibilityLiveRegion="polite"
      style={{ bottom }}
      className="absolute flex-row items-center gap-2 self-center rounded-full border border-hairline bg-raised px-4 py-2"
    >
      <Icon name={icon} size={16} color={state === 'error' ? colors.danger : colors.muted} />
      <Text variant="caption">{label}</Text>
    </View>
  );
}
