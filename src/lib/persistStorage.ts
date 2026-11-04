import AsyncStorage from '@react-native-async-storage/async-storage';
import { createJSONStorage } from 'zustand/middleware';

/** Сховище для zustand persist: AsyncStorage на телефоні, localStorage у браузері. */
export const persistStorage = createJSONStorage(() => AsyncStorage);
