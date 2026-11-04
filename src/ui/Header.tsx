import { router } from 'expo-router';
import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';

import { IconButton } from './IconButton';
import { Text } from './Text';

interface Props {
  title: string;
  /** Повернення назад; за замовчуванням — router.back() або головна. */
  onBack?: () => void;
  right?: ReactNode;
}

export function Header({ title, onBack, right }: Props) {
  const { t } = useTranslation();
  const back = onBack ?? (() => (router.canGoBack() ? router.back() : router.replace('/')));
  return (
    <View className="-ml-3 flex-row items-center gap-1">
      <IconButton icon="arrow-left" label={t('common.back')} onPress={back} />
      <Text variant="heading" className="flex-1" numberOfLines={1} accessibilityRole="header">
        {title}
      </Text>
      {right}
    </View>
  );
}
