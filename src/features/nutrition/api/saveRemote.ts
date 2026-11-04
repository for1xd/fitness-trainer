import { useNutrition } from '../store';
import type { Food } from '../types';
import type { RemoteFood } from './remoteSearch';

/** Зберігає товар з Open Food Facts / USDA як власний продукт (повторно — повертає той самий). */
export function saveRemoteFood(r: RemoteFood, servingLabel: string): Food {
  return useNutrition.getState().saveFood({
    source: r.source,
    externalId: r.externalId,
    barcode: r.barcode,
    name: r.name,
    brand: r.brand,
    per100: r.per100,
    portions: r.servingG
      ? [{ id: `${r.source}:${r.externalId}:serving`, label: servingLabel, grams: r.servingG }]
      : [],
  });
}
