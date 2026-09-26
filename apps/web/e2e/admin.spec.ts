import { expect, test } from '@playwright/test';

test('painel: exige login, altera preço sem código e o site reflete na hora', async ({ page }) => {
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
  await page.getByLabel('Preço de Dinheiro a dois').fill('21,90');
  await page.getByRole('button', { name: 'Salvar preços' }).click();
  await expect(page.getByText('Preços atualizados.')).toBeVisible();

  await page.goto('/modulos/dinheiro-a-dois');
  await expect(page.getByText('R$ 21,90').first()).toBeVisible();

  await page.goto('/admin/auditoria');
  await expect(page.getByText('Dinheiro a dois: R$ 19,90 → R$ 21,90')).toBeVisible();

  await page.getByRole('button', { name: 'Sair' }).click();
  await expect(page).toHaveURL(/\/admin\/login$/);
  await page.goto('/admin/precos');
  await expect(page).toHaveURL(/\/admin\/login$/);
});
