import { beforeEach, describe, expect, it } from 'vitest';
import { db } from '@/server/db';
import { invalidateQuizDefinition } from '@/server/definition';
import { HttpError } from '@/server/http';
import { resetRateLimits } from '@/server/security/rate-limit';
import { generateToken, hashToken } from '@/server/security/tokens';
import {
  consumeRecovery,
  deleteResult,
  getResultView,
  requestRecovery,
  saveResultEmail,
} from '@/server/services/result-service';
import { CONFLICT_CHOICES, lastEmailTo, playQuiz, uniqueEmail } from './helpers';

beforeEach(() => {
  resetRateLimits();
  invalidateQuizDefinition();
});

const linkIn = (body: string | undefined, prefix: string) => {
  const match = body?.match(new RegExp(`https?://[^\\s]+${prefix}([A-Za-z0-9_-]{43})`));
  return match?.[1] ?? null;
};

describe('recuperação de resultado', () => {
  it('o link do resultado dá acesso ao resultado congelado', async () => {
    const { token } = await playQuiz(CONFLICT_CHOICES);
    const view = await getResultView(token);
    expect(view?.primary).toMatchObject({ categoryId: 'cat_conflitos', name: 'Conflitos e discussões' });
    expect(view?.flags).toContain('safety_support');
    expect(view?.modules[0]).toMatchObject({ slug: 'conflitos-sem-guerra', priceAgreement: 'agree', preselected: true });
    expect(view?.scores.map((s) => s.categoryId)).toHaveLength(6);
  });

  it('tokens inválidos, malformados ou de quiz não concluído não dão acesso', async () => {
    const inProgress = await playQuiz({}, { stopAfter: 2 });
    expect(await getResultView(inProgress.token)).toBeNull();
    expect(await getResultView(generateToken())).toBeNull();
    expect(await getResultView('curto')).toBeNull();
    expect(await getResultView("' OR 1=1 --")).toBeNull();
  });

  it('o banco guarda apenas o hash do token (vazamento do banco não expõe links)', async () => {
    const { token, sessionId } = await playQuiz();
    const stored = await db().sessionAccessToken.findMany({ where: { sessionId } });
    expect(stored).toHaveLength(1);
    expect(stored[0]!.tokenHash).toBe(hashToken(token));
    expect(stored[0]!.tokenHash).not.toContain(token);
  });

  it('envia o link por e-mail (com consentimento) e permite recuperar por e-mail com link mágico de uso único', async () => {
    const email = uniqueEmail('recupera');
    const { token } = await playQuiz(CONFLICT_CHOICES);
    await saveResultEmail(token, email.toUpperCase(), 'ip-teste');

    const resultEmail = await lastEmailTo(email);
    expect(linkIn(resultEmail?.body, '/resultado/')).toBe(token);

    await requestRecovery(email, 'ip-teste');
    const recoveryEmail = await lastEmailTo(email);
    expect(recoveryEmail?.subject).toMatch(/Recupere/);
    const recoveryToken = linkIn(recoveryEmail?.body, '/recuperar/');
    expect(recoveryToken).not.toBeNull();

    const recovered = await consumeRecovery(recoveryToken!);
    expect(recovered).toHaveLength(1);
    const newToken = recovered![0]!.resultPath.replace('/resultado/', '');
    expect(newToken).not.toBe(token);
    expect((await getResultView(newToken))?.primary?.categoryId).toBe('cat_conflitos');
    expect((await getResultView(token))?.primary?.categoryId).toBe('cat_conflitos'); // o link antigo continua válido

    // uso único
    expect(await consumeRecovery(recoveryToken!)).toBeNull();
  });

  it('não revela se um e-mail existe: nenhum e-mail é enviado para endereços sem resultado', async () => {
    const unknown = uniqueEmail('desconhecido');
    await expect(requestRecovery(unknown, 'ip-teste')).resolves.toBeUndefined();
    expect(await lastEmailTo(unknown)).toBeNull();
  });

  it('links de recuperação expiram', async () => {
    const email = uniqueEmail('expira');
    const { token } = await playQuiz();
    await saveResultEmail(token, email, 'ip-teste');
    const expiredToken = generateToken();
    await db().recoveryToken.create({
      data: { tokenHash: hashToken(expiredToken), email, expiresAt: new Date(Date.now() - 1000) },
    });
    expect(await consumeRecovery(expiredToken)).toBeNull();
  });

  it('limita pedidos de recuperação por e-mail (proteção contra abuso)', async () => {
    const email = uniqueEmail('limite');
    for (let i = 0; i < 3; i += 1) await requestRecovery(email, `ip-${i}`);
    await expect(requestRecovery(email, 'ip-9')).rejects.toMatchObject({ status: 429 });
  });

  it('valida o formato do e-mail', async () => {
    const { token } = await playQuiz();
    await expect(saveResultEmail(token, 'nao-e-email', 'ip')).rejects.toThrow();
    await expect(requestRecovery('invalido@', 'ip')).rejects.toThrow();
  });

  it('exclusão a pedido da pessoa (LGPD) remove respostas, resultado e tokens', async () => {
    const { token, sessionId } = await playQuiz();
    expect(await deleteResult(token)).toBe(true);
    expect(await db().quizSession.findUnique({ where: { id: sessionId } })).toBeNull();
    expect(await db().sessionAccessToken.count({ where: { sessionId } })).toBe(0);
    expect(await getResultView(token)).toBeNull();
    expect(await deleteResult(token)).toBe(false);
  });

  it('resultado não pode receber e-mail se não estiver concluído', async () => {
    const { token } = await playQuiz({}, { stopAfter: 1 });
    await expect(saveResultEmail(token, uniqueEmail('x'), 'ip')).rejects.toBeInstanceOf(HttpError);
  });
});
