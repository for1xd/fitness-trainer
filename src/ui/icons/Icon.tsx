import createIconSet from '@expo/vector-icons/createIconSet';
import font from '../../../assets/fonts/MaterialCommunityIcons.ttf';
import type { ComponentProps } from 'react';

import glyphs from './glyphs.json';

/**
 * Іконки Material Community лише з потрібних символів (scripts/build-icons.mjs).
 * Шрифт і карта символів обрізані до цих символів (у ~100 разів менші за повні).
 */
export const Icon = createIconSet(glyphs, 'mci-subset', font);

export type IconName = ComponentProps<typeof Icon>['name'];
