import type { ReactNode } from 'react';
import { ButtonLink, buttonClasses } from '@/components/ui/Button';
import { Icon } from '@/components/ui/Icon';

type Variant = Parameters<typeof buttonClasses>[0];
type Size = Parameters<typeof buttonClasses>[1];

/**
 * Botão de compra: leva ao checkout do próprio site ou a um checkout externo cadastrado no admin
 * (ex.: Kiwify). O link externo já foi validado como `https:` ao ser salvo.
 */
export function BuyLink({
  href,
  external,
  variant = 'primary',
  size = 'md',
  className = '',
  children,
}: {
  href: string;
  external: boolean;
  variant?: Variant;
  size?: Size;
  className?: string;
  children: ReactNode;
}) {
  if (external) {
    return (
      <a href={href} rel="noopener" className={buttonClasses(variant, size, className)}>
        {children}
        <Icon name="external" className="h-4 w-4" />
      </a>
    );
  }
  return (
    <ButtonLink href={href} variant={variant} size={size} className={className}>
      {children}
      <Icon name="arrowRight" className="h-4 w-4" />
    </ButtonLink>
  );
}
