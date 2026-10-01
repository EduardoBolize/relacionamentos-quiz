/**
 * Links externos cadastrados no admin (ex.: checkout da Kiwify). Só aceita `https:` sem usuário/senha
 * embutidos — bloqueia `javascript:`, `data:` e afins, que poderiam executar código ao clicar.
 */
export function isSafeExternalUrl(value: string): boolean {
  if (value.length > 500) return false;
  try {
    const url = new URL(value);
    return url.protocol === 'https:' && !url.username && !url.password && url.hostname.includes('.');
  } catch {
    return false;
  }
}
