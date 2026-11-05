import { Icon } from '@/ui/icons/Icon';
import { View } from 'react-native';

import { useTheme } from '@/theme/ThemeProvider';

import { Text } from './Text';

interface Props {
  text: string;
  tone?: 'warn' | 'info';
}

export function Notice({ text, tone = 'info' }: Props) {
  const { colors } = useTheme();
  return (
    <View className="flex-row gap-3 rounded-card border border-hairline bg-surface p-4">
      <Icon
        name={tone === 'warn' ? 'alert-outline' : 'information-outline'}
        size={22}
        color={tone === 'warn' ? colors.warn : colors.muted}
      />
      <Text variant="body" className="flex-1 text-[15px]">
        {text}
      </Text>
    </View>
  );
}
