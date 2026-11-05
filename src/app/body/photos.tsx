import { checkPickedImage } from '@/lib/imageCheck';
import { randomUUID } from 'expo-crypto';
import * as ImagePicker from 'expo-image-picker';
import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, Image, Pressable, View } from 'react-native';

import {
  signedPhotoUrl,
  useProgress,
  type PhotoAngle,
  type ProgressPhoto,
} from '@/features/progress/store';
import { confirmAction } from '@/lib/confirm';
import { parseIsoDate } from '@/lib/dates';
import { formatShortDate } from '@/lib/format';
import { storeImageLocally } from '@/lib/localImage';
import { useTheme } from '@/theme/ThemeProvider';
import { Button, Header, IconButton, Notice, Screen, Segmented, Text } from '@/ui';

const ANGLES: PhotoAngle[] = ['front', 'side', 'back'];

export default function PhotosScreen() {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const photos = useProgress((s) => s.photos);
  const { addPhoto, deletePhoto } = useProgress.getState();
  const [angle, setAngle] = useState<PhotoAngle>('front');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(false);

  const ofAngle = useMemo(
    () => photos.filter((p) => p.angle === angle).sort((a, b) => a.date.localeCompare(b.date)),
    [photos, angle],
  );
  const first = ofAngle[0];
  const last = ofAngle.at(-1);
  const date = (iso: string) => formatShortDate(parseIsoDate(iso));

  const add = async (source: 'camera' | 'library') => {
    setError(false);
    try {
      if (source === 'camera' && !(await ImagePicker.requestCameraPermissionsAsync()).granted)
        return;
      const options: ImagePicker.ImagePickerOptions = { mediaTypes: ['images'], quality: 1 };
      const picked =
        source === 'camera'
          ? await ImagePicker.launchCameraAsync(options)
          : await ImagePicker.launchImageLibraryAsync(options);
      const asset = picked.canceled ? undefined : picked.assets[0];
      if (!asset) return;
      if (checkPickedImage(asset)) {
        setError(true);
        return;
      }
      setBusy(true);
      const id = randomUUID();
      const stored = await storeImageLocally(
        asset.uri,
        `progress-${id}`,
        asset.width,
        asset.height,
      );
      await addPhoto({ id, localUri: stored.uri, base64: stored.base64, angle });
    } catch {
      setError(true);
    } finally {
      setBusy(false);
    }
  };

  const remove = async (p: ProgressPhoto) => {
    const ok = await confirmAction({
      title: t('photosScreen.deleteTitle', { date: date(p.date) }),
      message: t('photosScreen.deleteBody'),
      confirmLabel: t('photosScreen.delete'),
      cancelLabel: t('common.cancel'),
      destructive: true,
    });
    if (ok) deletePhoto(p.id);
  };

  return (
    <Screen edges={['top', 'bottom']}>
      <Header title={t('photosScreen.title')} />
      <Notice text={t('photosScreen.private')} />
      <Segmented
        label={t('photosScreen.angle')}
        value={angle}
        onChange={setAngle}
        options={ANGLES.map((a) => ({ value: a, label: t(`photosScreen.angles.${a}`) }))}
      />
      <View className="flex-row gap-3">
        <Button
          label={t('photosScreen.take')}
          onPress={() => void add('camera')}
          className="flex-1"
          compact
          disabled={busy}
        />
        <Button
          label={t('photosScreen.pick')}
          variant="secondary"
          onPress={() => void add('library')}
          className="flex-1"
          compact
          disabled={busy}
        />
      </View>
      {busy ? (
        <View className="flex-row items-center gap-3">
          <ActivityIndicator color={colors.ink} />
          <Text variant="body">{t('photosScreen.saving')}</Text>
        </View>
      ) : null}
      {error ? <Notice tone="warn" text={t('photosScreen.error')} /> : null}

      {first && last && first.id !== last.id ? (
        <View className="gap-2">
          <Text variant="heading">{t('photosScreen.compare')}</Text>
          <View className="flex-row gap-2">
            {[
              { p: first, label: t('photosScreen.first', { date: date(first.date) }) },
              { p: last, label: t('photosScreen.last', { date: date(last.date) }) },
            ].map(({ p, label }) => (
              <View key={p.id} className="flex-1 gap-1">
                <PhotoImage photo={p} label={label} />
                <Text variant="caption">{label}</Text>
              </View>
            ))}
          </View>
        </View>
      ) : null}

      <View className="gap-2">
        <Text variant="heading">{t('photosScreen.all')}</Text>
        {ofAngle.length === 0 ? (
          <Text variant="body" className="text-muted">
            {t('photosScreen.empty')}
          </Text>
        ) : (
          <View className="flex-row flex-wrap gap-2">
            {[...ofAngle].reverse().map((p) => (
              <Pressable
                key={p.id}
                accessibilityRole="button"
                accessibilityHint={t('photosScreen.delete')}
                onLongPress={() => void remove(p)}
                className="w-[31%] gap-1"
              >
                <PhotoImage
                  photo={p}
                  label={t('photosScreen.photoOf', {
                    angle: t(`photosScreen.angles.${p.angle}`).toLowerCase(),
                    date: date(p.date),
                  })}
                />
                <View className="flex-row items-center justify-between">
                  <Text variant="caption">{date(p.date)}</Text>
                  <IconButton
                    icon="trash-can-outline"
                    label={t('photosScreen.delete')}
                    onPress={() => void remove(p)}
                  />
                </View>
              </Pressable>
            ))}
          </View>
        )}
      </View>
    </Screen>
  );
}

/** Локальне фото або тимчасове посилання з приватного сховища. */
function PhotoImage({ photo, label }: { photo: ProgressPhoto; label: string }) {
  const [remote, setRemote] = useState<string | null>(null);
  useEffect(() => {
    if (photo.localUri || !photo.storagePath) return;
    let alive = true;
    void signedPhotoUrl(photo.storagePath).then((u) => alive && setRemote(u));
    return () => {
      alive = false;
    };
  }, [photo.localUri, photo.storagePath]);
  const uri = photo.localUri ?? remote;
  return uri ? (
    <Image
      source={{ uri }}
      accessibilityLabel={label}
      className="aspect-[3/4] w-full rounded-2xl"
      resizeMode="cover"
    />
  ) : (
    <View
      className="aspect-[3/4] w-full rounded-card border border-hairline bg-surface"
      accessibilityLabel={label}
    />
  );
}
