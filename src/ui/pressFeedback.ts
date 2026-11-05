import { Platform, type ViewStyle } from 'react-native';

/** На вебі масштаб натискання змінюється плавно (лише transform). */
const TRANSITION = Platform.select<ViewStyle>({
  web: {
    transitionProperty: 'transform',
    transitionDuration: '120ms',
    transitionTimingFunction: 'ease-out',
  } as ViewStyle,
  default: {},
});

/** Натискання: легке стискання до 0.97; із «зменшити рух» — без масштабу. */
export const pressStyle = (pressed: boolean, reduced: boolean): ViewStyle[] => [
  TRANSITION,
  { transform: [{ scale: pressed && !reduced ? 0.97 : 1 }] },
];
