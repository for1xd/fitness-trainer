import { Stack, useStackScreenOptions } from '@/ui/navigation/Stack';

export default function RecipeLayout() {
  return <Stack screenOptions={useStackScreenOptions()} />;
}
