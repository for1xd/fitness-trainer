import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';

import { confirmAction } from '@/lib/confirm';
import { useSaveStatus } from '@/lib/cloud/storage';
import { filesSupported, pickTextFile, saveTextFile } from '@/lib/files';
import { Button, Notice, Text } from '@/ui';

import { exportFileName, exportJson, importJson, resetAll } from '../api/transfer';
import { MAX_IMPORT_BYTES } from '../logic/envelope';

/** Профіль → де зберігаються дані, експорт, імпорт і повне скидання. */
export function DataSection() {
  const { t } = useTranslation();
  const cloud = useSaveStatus((s) => s.cloud);
  const [message, setMessage] = useState<{ text: string; tone: 'info' | 'error' } | null>(null);
  const [busy, setBusy] = useState(false);

  const modeKey = (
    {
      account: 'data.modeAccount',
      readonly: 'data.modeReadonly',
      device: 'data.modeDevice',
      pending: 'data.modePending',
    } as const
  )[cloud];

  const doExport = async () => {
    setMessage(null);
    try {
      await saveTextFile(exportFileName(), exportJson());
      setMessage({ text: t('data.exportDone'), tone: 'info' });
    } catch {
      setMessage({ text: t('data.exportFailed'), tone: 'error' });
    }
  };

  const doImport = async () => {
    setMessage(null);
    const text = await pickTextFile('application/json,.json', MAX_IMPORT_BYTES);
    if (text === null) return;
    if (text === 'tooLarge') {
      setMessage({ text: t('data.importErrors.tooLarge'), tone: 'error' });
      return;
    }
    const ok = await confirmAction({
      title: t('data.importTitle'),
      message: t('data.importBody'),
      confirmLabel: t('data.importConfirm'),
      cancelLabel: t('common.cancel'),
      destructive: true,
    });
    if (!ok) return;
    setBusy(true);
    const result = await importJson(text);
    setBusy(false);
    setMessage(
      result.ok
        ? { text: t('data.importDone'), tone: 'info' }
        : { text: t(`data.importErrors.${result.error}`), tone: 'error' },
    );
  };

  const doReset = async () => {
    const ok = await confirmAction({
      title: t('data.resetTitle'),
      message: t('data.resetBody'),
      confirmLabel: t('data.resetConfirm'),
      cancelLabel: t('common.cancel'),
      destructive: true,
    });
    if (!ok) return;
    setBusy(true);
    await resetAll();
    setBusy(false);
  };

  return (
    <View className="gap-3 rounded-card border border-hairline bg-surface p-4">
      <Text variant="heading">{t('data.title')}</Text>
      <Text variant="body" className="text-muted">
        {t(modeKey)}
      </Text>
      {message ? (
        <Notice text={message.text} tone={message.tone === 'error' ? 'warn' : 'info'} />
      ) : null}
      {filesSupported ? (
        <>
          <Button label={t('data.export')} variant="secondary" onPress={() => void doExport()} />
          <Button
            label={t('data.import')}
            variant="secondary"
            loading={busy}
            onPress={() => void doImport()}
          />
        </>
      ) : (
        <Text variant="caption">{t('data.nativeHint')}</Text>
      )}
      <Button label={t('data.reset')} variant="danger" onPress={() => void doReset()} />
    </View>
  );
}
