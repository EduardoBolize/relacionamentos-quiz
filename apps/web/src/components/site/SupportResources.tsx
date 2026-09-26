import { Icon } from '@/components/ui/Icon';

/**
 * Canais de apoio. Exibido em destaque no resultado quando as respostas indicam medo ou controle
 * (sinalizador `safety_support`), ANTES de qualquer oferta.
 */
export function SupportResources({ emphasis = false }: { emphasis?: boolean }) {
  return (
    <section
      aria-labelledby="apoio-titulo"
      className={`rounded-2xl border p-5 sm:p-6 ${emphasis ? 'border-amber-300 bg-amber-50 text-amber-950' : 'border-slate-200 bg-slate-50 text-slate-800'}`}
    >
      <div className="flex items-start gap-3">
        <Icon name="shield" className="mt-1 h-6 w-6 shrink-0" />
        <div>
          <h2 id="apoio-titulo" className="text-lg font-bold">
            {emphasis ? 'Antes de tudo: você não está sozinho(a)' : 'Se precisar de apoio'}
          </h2>
          {emphasis ? (
            <p className="mt-2 text-sm leading-relaxed">
              Algumas respostas indicam que você pode sentir medo ou estar sob controle em alguns momentos. Isso merece
              atenção e cuidado. Se você se sentir em risco, procure ajuda — conversar com alguém de confiança ou com um
              serviço especializado pode fazer diferença.
            </p>
          ) : null}
          <ul className="mt-3 space-y-1.5 text-sm">
            <li>
              <strong>CVV — 188</strong>: apoio emocional gratuito, 24 horas (também por chat em cvv.org.br).
            </li>
            <li>
              <strong>Ligue 180</strong>: Central de Atendimento à Mulher, gratuito e sigiloso.
            </li>
            <li>
              <strong>Disque 100</strong>: denúncias de violações de direitos humanos.
            </li>
            <li>
              <strong>190</strong>: Polícia Militar, em situações de emergência.
            </li>
          </ul>
        </div>
      </div>
    </section>
  );
}
