import { Alert, Platform } from 'react-native';
import { create } from 'zustand';

export interface ConfirmOptions {
  title: string;
  message: string;
  confirmLabel: string;
  cancelLabel: string;
  destructive?: boolean;
}

interface ConfirmState {
  request: (ConfirmOptions & { resolve: (ok: boolean) => void }) | null;
}

/** Відкритий запит підтвердження — його показує `ConfirmHost` у корені застосунку. */
export const useConfirm = create<ConfirmState>(() => ({ request: null }));

export function answerConfirm(ok: boolean) {
  const r = useConfirm.getState().request;
  useConfirm.setState({ request: null });
  r?.resolve(ok);
}

/**
 * Підтвердження дії: системний діалог на телефоні, власний діалог у браузері
 * (window.confirm блокується всередині артефакта claude.ai).
 */
export function confirmAction(opts: ConfirmOptions): Promise<boolean> {
  if (Platform.OS === 'web') {
    useConfirm.getState().request?.resolve(false);
    return new Promise((resolve) => useConfirm.setState({ request: { ...opts, resolve } }));
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
