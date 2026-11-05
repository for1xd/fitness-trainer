import { Modal, Pressable, View } from 'react-native';

import { answerConfirm, useConfirm } from '@/lib/confirm';
import { ThemeScope } from '@/theme/ThemeProvider';

import { Button } from './Button';
import { Text } from './Text';

/** Діалог підтвердження для вебу; монтується один раз у корені застосунку. */
export function ConfirmHost() {
  const request = useConfirm((s) => s.request);
  if (!request) return null;
  return (
    <Modal transparent animationType="fade" visible onRequestClose={() => answerConfirm(false)}>
      <ThemeScope>
        <Pressable
          accessibilityLabel={request.cancelLabel}
          onPress={() => answerConfirm(false)}
          className="flex-1 items-center justify-center bg-black/60 p-4"
        >
          {/* Натискання всередині картки не закриває діалог */}
          <Pressable
            accessibilityRole="alert"
            onPress={() => undefined}
            className="w-full max-w-[420px] gap-4 rounded-card border border-hairline bg-raised p-6"
          >
            <Text variant="heading">{request.title}</Text>
            <Text variant="body" className="text-muted">
              {request.message}
            </Text>
            <View className="flex-row gap-3">
              <Button
                label={request.cancelLabel}
                variant="secondary"
                compact
                className="flex-1"
                onPress={() => answerConfirm(false)}
              />
              <Button
                label={request.confirmLabel}
                variant={request.destructive ? 'danger' : 'primary'}
                compact
                className="flex-1"
                onPress={() => answerConfirm(true)}
              />
            </View>
          </Pressable>
        </Pressable>
      </ThemeScope>
    </Modal>
  );
}
