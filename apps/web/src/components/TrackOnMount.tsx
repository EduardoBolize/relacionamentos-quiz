'use client';

import type { ClientEventName } from '@relacionamentos/analytics';
import { useEffect, useRef } from 'react';
import { trackClientEvent } from '@/lib/consent';

/** Registra um evento de uso quando o componente aparece (somente com consentimento). */
export function TrackOnMount({ name, props }: { name: ClientEventName; props: Record<string, unknown> }) {
  const sent = useRef(false);
  useEffect(() => {
    if (sent.current) return;
    sent.current = true;
    trackClientEvent(name, props);
  }, [name, props]);
  return null;
}
