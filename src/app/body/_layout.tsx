import { Stack, useStackScreenOptions } from '@/ui/navigation/Stack';

export default function Layout() {
  return <Stack screenOptions={useStackScreenOptions()} />;
}
