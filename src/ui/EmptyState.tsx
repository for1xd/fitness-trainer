import { MaterialCommunityIcons } from '@expo/vector-icons';
import type { ComponentProps } from 'react';
import { View } from 'react-native';

import { useTheme } from '@/theme/ThemeProvider';

import { Button } from './Button';
import { Text } from './Text';

interface Props {
  icon: ComponentProps<typeof MaterialCommunityIcons>['name'];
  title: string;
  body: string;
  actionLabel: string;
  onAction: () => void;
}

export function EmptyState({ icon, title, body, actionLabel, onAction }: Props) {
  const { colors } = useTheme();
  return (
    <View className="gap-4 py-8">
      <MaterialCommunityIcons name={icon} size={40} color={colors.muted} />
      <Text variant="title">{title}</Text>
      <Text variant="body" className="text-muted">
        {body}
      </Text>
      <Button label={actionLabel} variant="secondary" onPress={onAction} className="self-start" />
    </View>
  );
}
