import { expect, test, type Page } from '@playwright/test';

/** Responde o quiz inteiro como uma pessoa faria: uma pergunta por tela, até o resultado. */
async function answerWholeQuiz(page: Page) {
  let priceSteps = 0;
  for (let i = 0; i < 45; i += 1) {
    if (/\/resultado\//.test(page.url())) return priceSteps;
    const form = page.locator('form[data-step-id]');
    await expect(form).toBeVisible();
    const stepId = await form.getAttribute('data-step-id');

    if (stepId?.startsWith('price:')) {
      priceSteps += 1;
      await page.getByText(priceSteps === 1 ? 'Sim, concordo com o valor' : 'Quero ver a prévia antes de decidir').click();
    } else if ((await form.locator('input[type=checkbox]').count()) > 0) {
      await form.locator('label').first().click();
      await page.getByRole('button', { name: /^OK/ }).click();
    } else {
      await form.locator('label').first().click(); // escolha única: avança sozinho
    }

    // espera o próximo passo (ou a página de resultado)
    await page.waitForFunction(
      (previous) =>
        location.pathname.startsWith('/resultado/') ||
        (document.querySelector('form[data-step-id]')?.getAttribute('data-step-id') ?? previous) !== previous,
      stepId,
      { timeout: 15_000 },
    );
  }
  throw new Error('O quiz não chegou ao resultado');
}

test('jornada completa: landing → quiz adaptativo → módulo ideal → checkout Pix → aulas e texto', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { level: 1 })).toContainText(/módulo ideal/i);
  await page.getByRole('button', { name: 'Aceitar métricas anônimas' }).click();

  await page.getByRole('link', { name: /Descobrir meu módulo ideal/i }).first().click();
  await page.getByRole('button', { name: /Começar agora/i }).click();

  // uma pergunta por vez, com progresso visível e acessível
  await expect(page.getByRole('progressbar', { name: 'Progresso do quiz' })).toBeVisible();
  const priceSteps = await answerWholeQuiz(page);
  expect(priceSteps).toBe(2); // "Você em primeiro lugar" + a etapa do momento (conquista)

  await expect(page).toHaveURL(/\/resultado\/[A-Za-z0-9_-]{43}$/);
  await expect(page.getByText(/não é um diagnóstico/i).first()).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Como cada tema apareceu' })).toBeVisible();
  await expect(page.getByRole('progressbar')).toHaveCount(8);
  await expect(page.getByRole('heading', { name: /Seu módulo ideal/ })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Suas dúvidas, respondidas' })).toBeVisible();
  const resultUrl = page.url();

  // link de compartilhamento: somente leitura (sem excluir, sem e-mail)
  await page.getByRole('button', { name: 'Compartilhar (somente leitura)' }).click();
  const shareUrl = await page.locator('span.font-mono').filter({ hasText: '/resultado/' }).innerText();
  expect(shareUrl).not.toBe(resultUrl);
  const viewer = await page.context().newPage();
  await viewer.goto(shareUrl);
  await expect(viewer.getByText('Resultado compartilhado')).toBeVisible();
  await expect(viewer.getByRole('button', { name: /Excluir meus dados/ })).toHaveCount(0);
  await viewer.close();

  // checkout a partir do módulo ideal
  await page.getByRole('link', { name: /Quero este módulo/ }).first().click();
  await expect(page.getByRole('heading', { name: 'Finalizar compra' })).toBeVisible();
  await page.getByLabel('Nome completo').fill('Pessoa E2E');
  await page.getByLabel('E-mail').fill('pessoa.e2e@example.com');
  await page.getByLabel(/Li e aceito os termos/).check();
  await page.getByRole('button', { name: /Gerar Pix/ }).click();

  await expect(page.getByRole('heading', { name: /Pague com Pix/ })).toBeVisible();
  await expect(page.getByRole('img', { name: /QR Code do Pix/ })).toBeVisible();
  await page.getByRole('button', { name: 'Simular pagamento aprovado' }).click();
  await expect(page.getByText('Pagamento confirmado')).toBeVisible();

  await page.getByRole('link', { name: 'Acessar aulas' }).first().click();
  await expect(page.getByRole('heading', { name: /Aulas em vídeo/ })).toBeVisible();
  await expect(page.getByRole('heading', { name: /Texto do módulo/ })).toBeVisible();
  await expect(page.getByText('Aula 3.')).toBeVisible();

  // o resultado continua acessível pelo link salvo
  await page.goto(resultUrl);
  await expect(page.getByRole('heading', { name: 'Como cada tema apareceu' })).toBeVisible();
});

test('pagamento com cartão de teste recusado mostra o motivo e permite tentar de novo', async ({ page }) => {
  await page.goto('/checkout?modulos=romance-e-surpresas');
  await page.getByLabel('Nome completo').fill('Pessoa Cartão');
  await page.getByLabel('E-mail').fill('cartao.e2e@example.com');
  await page.getByText('Cartão', { exact: true }).click();
  await page.getByLabel('Número do cartão').fill('4000 0000 0000 0002');
  await page.getByLabel('Nome impresso no cartão').fill('PESSOA CARTAO');
  await page.getByLabel('Validade').fill('12/30');
  await page.getByLabel('CVV').fill('123');
  await page.getByLabel(/Li e aceito os termos/).check();
  await page.getByRole('button', { name: /^Pagar/ }).click();

  await expect(page.getByRole('heading', { name: 'Pagamento não aprovado' })).toBeVisible();
  await expect(page.getByText(/recusado/i).first()).toBeVisible();
  await expect(page.getByRole('link', { name: 'Tentar novamente' })).toHaveAttribute('href', '/checkout?modulos=romance-e-surpresas');
});

test('cabeçalhos de segurança e páginas privadas', async ({ request }) => {
  const home = await request.get('/');
  const csp = home.headers()['content-security-policy'] ?? '';
  expect(csp).toMatch(/script-src 'self' 'nonce-[^']+' 'strict-dynamic'/);
  expect(csp).toContain("frame-ancestors 'none'");
  expect(csp).toContain('frame-src https://www.youtube-nocookie.com https://player.vimeo.com');
  expect(home.headers()['x-frame-options']).toBe('DENY');
  expect(home.headers()['x-content-type-options']).toBe('nosniff');
  expect(home.headers()['x-powered-by']).toBeUndefined();

  const privateResult = await request.get('/resultado/tokenQueNaoExisteAAAAAAAAAAAAAAAAAAAAAAAAAAA');
  expect(privateResult.status()).toBe(404);
  expect(privateResult.headers()['cache-control']).toContain('no-store');
  expect(privateResult.headers()['x-robots-tag']).toContain('noindex');
  expect(privateResult.headers()['referrer-policy']).toBe('no-referrer');
});
