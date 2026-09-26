export { formatBRL } from '@relacionamentos/payments/client';

const dateTime = new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short', timeZone: 'America/Sao_Paulo' });
const dateOnly = new Intl.DateTimeFormat('pt-BR', { dateStyle: 'long', timeZone: 'America/Sao_Paulo' });

export function formatDateTime(value: string | Date): string {
  return dateTime.format(typeof value === 'string' ? new Date(value) : value);
}

export function formatDate(value: string | Date): string {
  return dateOnly.format(typeof value === 'string' ? new Date(value) : value);
}

export const ORDER_STATUS_LABELS: Record<string, string> = {
  pending: 'Aguardando pagamento',
  paid: 'Pago',
  failed: 'Recusado',
  expired: 'Expirado',
  canceled: 'Cancelado',
  refunded: 'Reembolsado',
};

export const METHOD_LABELS: Record<string, string> = { pix: 'Pix', boleto: 'Boleto', card: 'Cartão de crédito' };
