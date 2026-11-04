import { Text as RNText, type TextProps } from 'react-native';

type Variant = 'hero' | 'number' | 'title' | 'heading' | 'body' | 'label' | 'caption';

/** Типографічна шкала: Unbounded — для цифр і заголовків, Manrope — для тексту. */
const variants: Record<Variant, string> = {
  hero: 'font-display-bold text-[56px] leading-[60px] tracking-tight text-ink',
  number: 'font-display text-2xl leading-8 text-ink',
  title: 'font-display text-[26px] leading-[32px] text-ink',
  heading: 'font-body-bold text-lg leading-6 text-ink',
  body: 'font-body text-base leading-6 text-ink',
  label: 'font-body-semibold text-[15px] leading-5 text-ink',
  caption: 'font-body text-sm leading-5 text-muted',
};

interface Props extends TextProps {
  variant?: Variant;
  className?: string;
}

export function Text({ variant = 'body', className = '', ...rest }: Props) {
  return (
    <RNText
      accessibilityRole={variant === 'title' || variant === 'hero' ? 'header' : undefined}
      className={`${variants[variant]} ${className}`}
      maxFontSizeMultiplier={1.6}
      {...rest}
    />
  );
}
