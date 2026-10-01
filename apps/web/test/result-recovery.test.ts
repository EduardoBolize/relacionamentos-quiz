import { beforeEach, describe, expect, it } from 'vitest';
import { db } from '@/server/db';
import { invalidateQuizDefinition } from '@/server/definition';
import { HttpError } from '@/server/http';
import { resetRateLimits } from '@/server/security/rate-limit';
import { generateToken, hashToken } from '@/server/security/tokens';
import {
  consumeRecovery,
  createShareLink,
  deleteResult,
  getResultView,
  requestRecovery,
  saveResultEmail,
} from '@/server/services/result-service';
import { BREAKUP_CHOICES, lastEmailTo, playQuiz, uniqueEmail } from './helpers';

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
    const { token } = await playQuiz(BREAKUP_CHOICES);
    const view = await getResultView(token);
    expect(view?.primary).toMatchObject({ categoryId: 'cat_termino', name: 'Término e recomeço' });
    expect(view?.flags).toContain('safety_support');
    expect(view?.modules[0]).toMatchObject({ slug: 'depois-do-termino', priceAgreement: 'agree', preselected: true, videoCount: 3, buyHref: '/checkout?modulos=depois-do-termino', buyExternal: false });
    expect(view?.scores.map((s) => s.categoryId)).toHaveLength(8);
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
    const { token } = await playQuiz(BREAKUP_CHOICES);
    await saveResultEmail(token, email.toUpperCase());

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
    expect((await getResultView(newToken))?.primary?.categoryId).toBe('cat_termino');
    expect((await getResultView(token))?.primary?.categoryId).toBe('cat_termino'); // o link antigo continua válido

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
    await saveResultEmail(token, email);
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
    await expect(saveResultEmail(token, 'nao-e-email')).rejects.toThrow();
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

  it('link de compartilhamento é somente leitura: vê o resultado, mas não troca e-mail, não exclui e não compartilha', async () => {
    const owner = await playQuiz(BREAKUP_CHOICES);
    const sharePath = await createShareLink(owner.token);
    const viewerToken = sharePath.replace('/resultado/', '');

    const view = await getResultView(viewerToken);
    expect(view?.access).toBe('viewer');
    expect(view?.primary?.categoryId).toBe('cat_termino');
    expect(view?.hasEmail).toBe(false);
    expect((await getResultView(owner.token))?.access).toBe('owner');

    await expect(saveResultEmail(viewerToken, uniqueEmail('intruso'))).rejects.toMatchObject({ status: 404 });
    await expect(createShareLink(viewerToken)).rejects.toMatchObject({ status: 404 });
    expect(await deleteResult(viewerToken)).toBe(false);
    expect(await getResultView(owner.token)).not.toBeNull();

    const stored = await db().sessionAccessToken.findFirstOrThrow({ where: { tokenHash: hashToken(viewerToken) } });
    expect(stored).toMatchObject({ scope: 'viewer', source: 'share' });
  });

  it('links de recuperação são de dono (permitem gerenciar o resultado)', async () => {
    const email = uniqueEmail('dono');
    const { token } = await playQuiz();
    await saveResultEmail(token, email);
    await requestRecovery(email, null);
    const recoveryToken = linkIn((await lastEmailTo(email))?.body, '/recuperar/');
    const [recovered] = (await consumeRecovery(recoveryToken!))!;
    const recoveredToken = recovered!.resultPath.replace('/resultado/', '');
    expect((await getResultView(recoveredToken))?.access).toBe('owner');
  });

  it('resultado não pode receber e-mail se não estiver concluído', async () => {
    const { token } = await playQuiz({}, { stopAfter: 1 });
    await expect(saveResultEmail(token, uniqueEmail('x'))).rejects.toBeInstanceOf(HttpError);
  });
});
