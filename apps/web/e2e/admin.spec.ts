import { expect, test } from '@playwright/test';

test('painel: exige login, altera preço e publica vídeo de aula sem código; o site reflete na hora', async ({ page }) => {
  await page.goto('/admin');
  await expect(page).toHaveURL(/\/admin\/login$/);

  await page.getByLabel('E-mail').fill(process.env.E2E_ADMIN_EMAIL!);
  await page.getByLabel('Senha').fill('senha-incorreta-123');
  await page.getByRole('button', { name: 'Entrar' }).click();
  await expect(page.getByText('E-mail ou senha inválidos.')).toBeVisible();

  await page.getByLabel('Senha').fill(process.env.E2E_ADMIN_PASSWORD!);
  await page.getByRole('button', { name: 'Entrar' }).click();
  await expect(page.getByRole('heading', { name: 'Painel', level: 1 })).toBeVisible();
  await expect(page.getByText('Tudo certo: nenhuma inconsistência')).toBeVisible();

  await page.goto('/admin/precos');
  await page.getByLabel('Preço de Romance e Surpresas').fill('17,90');
  await page.getByRole('button', { name: 'Salvar preços' }).click();
  await expect(page.getByText('Preços atualizados.')).toBeVisible();

  await page.goto('/modulos/romance-e-surpresas');
  await expect(page.getByText('R$ 17,90').first()).toBeVisible();

  await page.goto('/admin/auditoria');
  await expect(page.getByText('Romance e Surpresas: R$ 15,00 → R$ 17,90')).toBeVisible();

  // publica o vídeo da aula grátis do módulo 1 (link do YouTube) e o site passa a incorporar o player
  await page.goto('/admin/modulos');
  await page.getByRole('link', { name: 'Editar' }).first().click();
  await page.getByLabel('Link do vídeo').first().fill('https://youtu.be/dQw4w9WgXcQ');
  await page.getByRole('button', { name: 'Salvar módulo' }).click();
  await expect(page.getByText('Módulo salvo.')).toBeVisible();
  await page.goto('/modulos/comece-por-voce');
  await expect(page.locator('iframe[src^="https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ"]')).toHaveCount(1);

  // checkout externo (Kiwify) do curso completo: o botão da página inicial passa a levar para lá
  await page.goto('/admin/configuracoes');
  await expect(page.getByLabel('Garantia (dias)')).toHaveValue('7');
  await page.getByLabel('Checkout externo do curso completo (opcional)').fill('https://pay.kiwify.com.br/curso-teste');
  await page.getByRole('button', { name: 'Salvar oferta' }).click();
  await expect(page.getByText('Oferta do curso salva.')).toBeVisible();
  await page.goto('/');
  await expect(page.getByRole('link', { name: /Quero o curso completo/ })).toHaveAttribute('href', 'https://pay.kiwify.com.br/curso-teste');

  await page.goto('/admin');
  await page.getByRole('button', { name: 'Sair' }).click();
  await expect(page).toHaveURL(/\/admin\/login$/);
  await page.goto('/admin/precos');
  await expect(page).toHaveURL(/\/admin\/login$/);
});
