import type { Metadata } from 'next';
import { SiteFooter } from '@/components/site/SiteFooter';
import { SiteHeader } from '@/components/site/SiteHeader';

export const metadata: Metadata = { title: 'Privacidade e dados' };

const SECTIONS = [
  {
    title: 'Quais dados coletamos',
    items: [
      'Respostas do teste: usadas somente para calcular o seu resultado. Não pedimos nome para fazer o teste.',
      'E-mail (opcional): apenas se você pedir o envio do resultado ou comprar uma seção do livro.',
      'Dados de compra: nome, e-mail, seções escolhidas e status do pagamento. Não armazenamos número de cartão, CVV nem CPF — esses dados vão direto ao provedor de pagamento.',
      'Métricas de uso anônimas: somente se você aceitar no aviso de cookies. Nunca incluem suas respostas.',
    ],
  },
  {
    title: 'Para que usamos',
    items: [
      'Gerar e mostrar o resultado do teste e permitir que você o recupere.',
      'Processar pedidos e liberar o acesso ao conteúdo comprado.',
      'Estatísticas agregadas (sem identificar pessoas) para melhorar perguntas e preços.',
    ],
  },
  {
    title: 'Seus direitos (LGPD, art. 18)',
    items: [
      'Excluir suas respostas e resultado a qualquer momento, pelo botão “Excluir meus dados” na página do resultado.',
      'Revogar o consentimento de métricas limpando os cookies do navegador.',
      'Solicitar acesso, correção ou eliminação de dados de compra pelo canal de atendimento.',
    ],
  },
  {
    title: 'Retenção e segurança',
    items: [
      'Testes não concluídos são apagados após 30 dias. Links de recuperação expiram em 30 minutos.',
      'Os links de acesso a resultados e pedidos são secretos: guardamos apenas uma versão criptográfica (hash) deles.',
      'Toda a comunicação acontece por conexão segura (HTTPS) em produção.',
    ],
  },
];

export default function PrivacyPage() {
  return (
    <>
      <SiteHeader />
      <main id="conteudo" className="mx-auto max-w-3xl px-4 py-14">
        <h1 className="text-3xl font-bold text-night-900">Privacidade e dados</h1>
        <p className="mt-3 text-slate-600">
          Texto de demonstração. Antes de publicar, revise esta política com assessoria jurídica e inclua os dados do
          controlador e do encarregado (DPO).
        </p>
        {SECTIONS.map((section) => (
          <section key={section.title} className="mt-10">
            <h2 className="text-xl font-bold text-night-900">{section.title}</h2>
            <ul className="mt-3 list-disc space-y-2 pl-5 text-slate-700">
              {section.items.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </section>
        ))}
      </main>
      <SiteFooter />
    </>
  );
}
