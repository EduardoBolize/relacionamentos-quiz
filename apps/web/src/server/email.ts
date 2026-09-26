import 'server-only';
import { db } from './db';
import { getEnv } from './env';

/**
 * Envio de e-mails. Em desenvolvimento, o provedor "outbox" grava as mensagens no banco para que
 * possam ser lidas em Admin → E-mails. Para produção, implemente `EmailProvider` com um serviço
 * real (Amazon SES, Resend, SendGrid, Postmark…) e registre-o em `getEmailProvider`.
 */
export interface EmailMessage {
  to: string;
  subject: string;
  text: string;
}

export interface EmailProvider {
  readonly name: string;
  send(message: EmailMessage): Promise<void>;
}

class OutboxEmailProvider implements EmailProvider {
  readonly name = 'outbox';
  async send(message: EmailMessage): Promise<void> {
    await db().emailOutbox.create({ data: { to: message.to, subject: message.subject, body: message.text } });
    console.info(`[e-mail simulado] para ${maskEmail(message.to)}: ${message.subject}`);
  }
}

class ConsoleEmailProvider implements EmailProvider {
  readonly name = 'console';
  async send(message: EmailMessage): Promise<void> {
    // Não registra o corpo (pode conter links de acesso).
    console.info(`[e-mail] para ${maskEmail(message.to)}: ${message.subject}`);
  }
}

export function getEmailProvider(): EmailProvider {
  return getEnv().EMAIL_PROVIDER === 'outbox' ? new OutboxEmailProvider() : new ConsoleEmailProvider();
}

/** Envia sem deixar uma falha de e-mail quebrar o fluxo principal. */
export async function sendEmailSafely(message: EmailMessage): Promise<boolean> {
  try {
    await getEmailProvider().send(message);
    return true;
  } catch (error) {
    console.error('[e-mail] falha no envio', error);
    return false;
  }
}

export function maskEmail(email: string): string {
  const [user = '', domain = ''] = email.split('@');
  return `${user.slice(0, 2)}***@${domain}`;
}

export function absoluteUrl(path: string): string {
  return new URL(path, getEnv().APP_URL).toString();
}

// ───────────────────────────── Modelos ─────────────────────────────

const SIGNATURE = '\n\n—\nEntre Nós (demonstração)\nEste é um e-mail automático. Se você não fez esta solicitação, ignore esta mensagem.';

export const emailTemplates = {
  resultLink(link: string): Omit<EmailMessage, 'to'> {
    return {
      subject: 'Seu resultado do quiz Entre Nós',
      text: `Olá!\n\nAqui está o link para rever o resultado do seu quiz quando quiser:\n${link}\n\nGuarde este link: ele é a chave de acesso ao seu resultado. Não o compartilhe com quem você não confia.${SIGNATURE}`,
    };
  },
  recovery(link: string): Omit<EmailMessage, 'to'> {
    return {
      subject: 'Recupere seu resultado — Entre Nós',
      text: `Olá!\n\nRecebemos um pedido para recuperar seus resultados. Use o link abaixo (válido por 30 minutos, uso único):\n${link}${SIGNATURE}`,
    };
  },
  orderPaid(link: string, titles: string[]): Omit<EmailMessage, 'to'> {
    return {
      subject: 'Pagamento confirmado — seu acesso ao Entre Nós',
      text: `Olá!\n\nSeu pagamento foi confirmado. Módulos liberados:\n${titles.map((t) => `• ${t}`).join('\n')}\n\nAcesse quando quiser:\n${link}\n\nEste link é pessoal.${SIGNATURE}`,
    };
  },
  orderCreated(link: string, method: string): Omit<EmailMessage, 'to'> {
    return {
      subject: 'Recebemos seu pedido — Entre Nós',
      text: `Olá!\n\nSeu pedido foi registrado (pagamento via ${method}). Acompanhe o status e conclua o pagamento em:\n${link}${SIGNATURE}`,
    };
  },
};
