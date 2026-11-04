import { useTranslation } from 'react-i18next';

import { Notice } from '@/ui';

export interface BarcodeCameraProps {
  onScanned: (code: string) => void;
  paused: boolean;
}

/** Веб-версія: сканування камерою — у застосунку на телефоні, тут лише ручне введення. */
export function BarcodeCamera(_props: BarcodeCameraProps) {
  const { t } = useTranslation();
  return <Notice text={t('barcode.webHint')} />;
}
