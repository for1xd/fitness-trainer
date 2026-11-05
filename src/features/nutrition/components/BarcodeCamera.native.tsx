import { CameraView, useCameraPermissions } from 'expo-camera';
import { useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';

import { Button, Text } from '@/ui';

import type { BarcodeCameraProps } from './BarcodeCamera';

/** Сканер штрихкодів камерою телефону (EAN-13/8, UPC). */
export function BarcodeCamera({ onScanned, paused }: BarcodeCameraProps) {
  const { t } = useTranslation();
  const [permission, requestPermission] = useCameraPermissions();
  const last = useRef<{ code: string; at: number } | null>(null);

  if (!permission) return null;
  if (!permission.granted) {
    return (
      <View className="gap-3 rounded-card border border-hairline bg-surface p-4">
        <Text variant="body">{t('barcode.permission')}</Text>
        <Button label={t('barcode.allowCamera')} onPress={() => void requestPermission()} />
      </View>
    );
  }

  return (
    <View className="h-72 overflow-hidden rounded-3xl bg-ink">
      <CameraView
        style={{ flex: 1 }}
        facing="back"
        barcodeScannerSettings={{ barcodeTypes: ['ean13', 'ean8', 'upc_a', 'upc_e'] }}
        onBarcodeScanned={
          paused
            ? undefined
            : ({ data }) => {
                // Камера повідомляє той самий код багато разів на секунду
                const now = Date.now();
                if (last.current && last.current.code === data && now - last.current.at < 3000)
                  return;
                last.current = { code: data, at: now };
                onScanned(data);
              }
        }
      />
      <View
        pointerEvents="none"
        className="absolute inset-x-10 top-1/2 h-0.5 bg-raised opacity-80"
      />
    </View>
  );
}
