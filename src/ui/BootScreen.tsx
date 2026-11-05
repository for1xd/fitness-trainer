import { useEffect, useState } from 'react';
import { useColorScheme, View } from 'react-native';

import { palettes } from '@/theme/tokens';

import { LogoMark } from './Logo';

const SKELETON_AFTER_MS = 300;

/**
 * Поки шрифти й збережені дані завантажуються: фон теми одразу,
 * а якщо довше 300 мс — каркас головного екрана замість порожнечі.
 * Без NativeWind і шрифтів — вони ще не готові.
 */
export function BootScreen() {
  const colors = palettes[useColorScheme() === 'dark' ? 'dark' : 'light'];
  const [show, setShow] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setShow(true), SKELETON_AFTER_MS);
    return () => clearTimeout(t);
  }, []);
  const block = (height: number, width: number | `${number}%` = '100%', radius = 20) => (
    <View style={{ height, width, borderRadius: radius, backgroundColor: colors.surface }} />
  );
  return (
    <View
      style={{ flex: 1, backgroundColor: colors.bg, padding: 16, paddingTop: 24, gap: 16 }}
      accessibilityLabel="…"
      accessibilityState={{ busy: true }}
    >
      {show ? (
        <View style={{ gap: 16, maxWidth: 720, width: '100%', alignSelf: 'center' }}>
          {block(32, '60%', 8)}
          {block(260)}
          <View style={{ flexDirection: 'row', gap: 12 }}>
            <View style={{ flex: 1 }}>{block(56, '100%', 16)}</View>
            <View style={{ flex: 1 }}>{block(56, '100%', 16)}</View>
          </View>
          {block(180)}
        </View>
      ) : (
        // Той самий знак і місце, що й у статичній заставці public/index.html
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <LogoMark size={64} arcColor={colors.accent} stemColor={colors.ink} />
        </View>
      )}
    </View>
  );
}
