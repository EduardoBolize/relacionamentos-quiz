import { HttpError, json, route } from '@/server/http';
import { MINUTE, enforceClientRateLimit } from '@/server/security/rate-limit';
import { getClientIp } from '@/server/security/request';
import { getOrderView } from '@/server/services/checkout-service';

/** Status do pedido (consultado periodicamente pela página enquanto aguarda o pagamento). */
export const GET = route<{ params: Promise<{ token: string }> }>(async (request, { params }) => {
  enforceClientRateLimit('order-status', getClientIp(request), { perIp: 240, global: 50_000, windowMs: 10 * MINUTE });
  const { token } = await params;
  const order = await getOrderView(token);
  if (!order) throw new HttpError(404, 'not_found', 'Pedido não encontrado.');
  return json({ status: order.status, paidAt: order.paidAt });
});
