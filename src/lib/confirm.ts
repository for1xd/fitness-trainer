import { Alert, Platform } from 'react-native';

interface ConfirmOptions {
  title: string;
  message: string;
  confirmLabel: string;
  cancelLabel: string;
  destructive?: boolean;
}

/** Підтвердження дії: системний діалог на телефоні, window.confirm у браузері. */
export function confirmAction(opts: ConfirmOptions): Promise<boolean> {
  if (Platform.OS === 'web') {
    return Promise.resolve(globalThis.confirm?.(`${opts.title}\n\n${opts.message}`) ?? false);
  }
  return new Promise((resolve) => {
    Alert.alert(opts.title, opts.message, [
      { text: opts.cancelLabel, style: 'cancel', onPress: () => resolve(false) },
      {
        text: opts.confirmLabel,
        style: opts.destructive ? 'destructive' : 'default',
        onPress: () => resolve(true),
      },
    ]);
  });
}
