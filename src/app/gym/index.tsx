import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { router } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Image, Pressable, ScrollView, View } from 'react-native';

import {
  BRANDS,
  GYM_PRESETS,
  MACHINE_TYPES,
  type MachineCategory,
  type MachineType,
} from '@/features/catalog/data';
import { useGym, type GymItem } from '@/features/gym/store';
import { useTheme } from '@/theme/ThemeProvider';
import { Button, Header, Screen, Text, TextField } from '@/ui';

const CATEGORIES: MachineCategory[] = ['free', 'legs', 'back', 'chest_shoulders', 'arms_core'];

export default function GymScreen() {
  const { t } = useTranslation();
  const gym = useGym((s) => s.gym);
  const saveGym = useGym((s) => s.saveGym);
  const [name, setName] = useState(gym?.name ?? '');
  const [items, setItems] = useState<Record<string, GymItem>>(() =>
    Object.fromEntries((gym?.items ?? []).map((i) => [i.machineTypeId, i])),
  );

  const applyPreset = (equipment: string[]) =>
    setItems(Object.fromEntries(equipment.map((id) => [id, items[id] ?? { machineTypeId: id }])));

  const toggle = (id: string) =>
    setItems((s) => {
      const next = { ...s };
      if (next[id]) delete next[id];
      else next[id] = { machineTypeId: id };
      return next;
    });

  const patch = (id: string, p: Partial<GymItem>) =>
    setItems((s) => ({ ...s, [id]: { ...s[id]!, ...p } }));

  const save = () => {
    saveGym({ id: gym?.id, name: name.trim() || t('gym.title'), items: Object.values(items) });
    router.back();
  };

  return (
    <Screen edges={['top', 'bottom']} footer={<Button label={t('gym.save')} onPress={save} />}>
      <Header title={t('gym.title')} />
      <Text variant="body" className="-mt-2 text-muted">
        {t('gym.intro')}
      </Text>
      <TextField
        label={t('gym.name')}
        placeholder={t('gym.namePlaceholder')}
        value={name}
        onChangeText={setName}
      />

      <View className="gap-2">
        <Text variant="label">{t('gym.presets')}</Text>
        <View className="flex-row flex-wrap gap-2">
          {GYM_PRESETS.map((p) => (
            <Button
              key={p.id}
              label={p.name}
              variant="secondary"
              compact
              onPress={() => applyPreset(p.equipment)}
            />
          ))}
        </View>
        <Text variant="caption">{t('gym.selected', { count: Object.keys(items).length })}</Text>
      </View>

      {CATEGORIES.map((cat) => (
        <View key={cat} className="gap-2">
          <Text variant="heading">{t(`gym.categories.${cat}`)}</Text>
          <View className="overflow-hidden rounded-2xl bg-surface">
            {MACHINE_TYPES.filter((m) => m.category === cat).map((m, i) => (
              <MachineRow
                key={m.id}
                machine={m}
                item={items[m.id]}
                first={i === 0}
                onToggle={() => toggle(m.id)}
                onPatch={(p) => patch(m.id, p)}
              />
            ))}
          </View>
        </View>
      ))}
    </Screen>
  );
}

function MachineRow({
  machine,
  item,
  first,
  onToggle,
  onPatch,
}: {
  machine: MachineType;
  item: GymItem | undefined;
  first: boolean;
  onToggle: () => void;
  onPatch: (p: Partial<GymItem>) => void;
}) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const selected = !!item;
  // Бренд і фото мають сенс лише для тренажерів, не для гантелей чи лав
  const branded = machine.category !== 'free';

  const pickPhoto = async () => {
    const res = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.6 });
    if (!res.canceled && res.assets[0]) onPatch({ photoUri: res.assets[0].uri });
  };

  return (
    <View className={first ? '' : 'border-t border-line'}>
      <Pressable
        accessibilityRole="checkbox"
        accessibilityState={{ checked: selected }}
        onPress={onToggle}
        className="min-h-14 flex-row items-center gap-3 px-4 py-2 active:bg-line"
      >
        <MaterialCommunityIcons
          name={selected ? 'checkbox-marked' : 'checkbox-blank-outline'}
          size={24}
          color={selected ? colors.ink : colors.muted}
        />
        <Text variant="body" className="flex-1">
          {machine.name_uk}
        </Text>
        {item?.photoUri ? (
          <Image
            source={{ uri: item.photoUri }}
            className="h-10 w-10 rounded-lg"
            accessibilityLabel={t('gym.photoOf', { name: machine.name_uk })}
          />
        ) : null}
      </Pressable>
      {selected && branded ? (
        <View className="gap-2 px-4 pb-3 pl-14">
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerClassName="gap-1.5"
          >
            {[{ id: undefined, name: t('gym.brandAny') }, ...BRANDS].map((b) => {
              const on = item.brandId === b.id;
              return (
                <Pressable
                  key={b.id ?? 'any'}
                  accessibilityRole="radio"
                  accessibilityState={{ checked: on }}
                  accessibilityLabel={`${t('gym.brand')}: ${b.name}`}
                  onPress={() => onPatch({ brandId: b.id })}
                  className={`h-10 justify-center rounded-full px-3 ${on ? 'bg-ink' : 'bg-bg active:bg-line'}`}
                >
                  <Text variant="caption" className={on ? 'text-inverse' : 'text-ink'}>
                    {b.name}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>
          <Button
            label={item.photoUri ? t('gym.changePhoto') : t('gym.addPhoto')}
            variant="ghost"
            onPress={() => void pickPhoto()}
            className="self-start"
          />
        </View>
      ) : null}
    </View>
  );
}
