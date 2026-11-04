import type { ReactNode } from 'react';
import { ScrollView, View } from 'react-native';
import { SafeAreaView, type Edge } from 'react-native-safe-area-context';

interface Props {
  children: ReactNode;
  /** Нижня панель з основною дією — у зоні великого пальця. */
  footer?: ReactNode;
  edges?: Edge[];
  /** Ширший макет для дашбордів на ПК */
  wide?: boolean;
}

/** Базовий екран: безпечні зони, прокрутка, обмежена ширина на ПК. */
export function Screen({ children, footer, edges = ['top'], wide = false }: Props) {
  const maxW = wide ? 'max-w-[1120px]' : 'max-w-[720px]';
  return (
    <SafeAreaView edges={edges} className="flex-1 bg-bg">
      <ScrollView
        keyboardShouldPersistTaps="handled"
        contentContainerClassName={`w-full ${maxW} self-center gap-6 px-4 pb-10 pt-4 md:px-8`}
      >
        {children}
      </ScrollView>
      {footer ? (
        <View className={`w-full ${maxW} gap-2 self-center px-4 pb-4 pt-2 md:px-8`}>{footer}</View>
      ) : null}
    </SafeAreaView>
  );
}
