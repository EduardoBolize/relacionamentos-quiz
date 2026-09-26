# Segurança

Este documento descreve o modelo de ameaças, os controles implementados e o que falta configurar antes de ir para
produção.

## O que protegemos

| Ativo | Por que importa |
| --- | --- |
| Respostas e resultados do quiz | Dados sensíveis sobre a vida afetiva (LGPD: tratar com o máximo cuidado). |
| Dados de compra (nome, e-mail) | Dados pessoais. |
| Conteúdo pago | Receita. |
| Painel admin | Controla perguntas, regras e preços. |
| Segredos (webhook, chaves do provedor) | Permitiriam forjar pagamentos. |

## Controles implementados

### Aplicação web

- **Content-Security-Policy com nonce por requisição** (`apps/web/src/proxy.ts`): `script-src 'self' 'nonce-…'
  'strict-dynamic'`, `object-src 'none'`, `base-uri 'self'`, `form-action 'self'`, `frame-ancestors 'none'`.
- **Cabeçalhos** (`next.config.ts`): `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`,
  `Referrer-Policy`, `Permissions-Policy`, `Cross-Origin-Opener-Policy`, `Cross-Origin-Resource-Policy`, HSTS em
  produção; `X-Powered-By` desativado.
- **Páginas com dados pessoais** (`/resultado`, `/pedido`, `/recuperar`, `/admin`, `/api`): `Cache-Control: no-store`,
  `Referrer-Policy: no-referrer` (o token da URL não vaza para outros sites) e `X-Robots-Tag: noindex`.
- **XSS**: o React escapa todo texto; o conteúdo editável usa um markdown restrito que nunca vira HTML
  (`SafeMarkdown`), sem links nem atributos. Nenhum `dangerouslySetInnerHTML`.

### Sessões, cookies e CSRF

- Cookies `HttpOnly`, `Secure` e com prefixo `__Host-` em produção; `SameSite=Lax` (quiz) e `SameSite=Strict` (admin).
- Toda requisição que altera estado passa por `assertSameOrigin` (`Origin`/`Referer` + `Sec-Fetch-Site`) e exige
  `Content-Type: application/json`.
- Sessões de admin no banco (revogáveis): expiração de 8 h e de 2 h por inatividade; logout e troca de senha encerram
  sessões.

### Autenticação do painel

- Senhas com **scrypt** (N=2¹⁷, r=8, p=1), parâmetros gravados junto do hash, comparação em tempo constante.
- Política de senha (mínimo de 12 caracteres, lista de senhas comuns); o seed recusa senhas fracas.
- **Bloqueio de 15 min após 5 falhas**, limite por IP e por e-mail, mensagens genéricas e hash “falso” para e-mails
  inexistentes (sem enumeração de usuários por conteúdo ou tempo).
- Autorização checada em **toda** página e rota do painel (o `proxy.ts` é só a primeira barreira).
- **Auditoria** de logins, falhas, bloqueios e alterações de conteúdo/preço.

### Tokens de acesso

- Resultado, pedido, recuperação e sessão admin usam **256 bits aleatórios** (`crypto.randomBytes`); no banco fica só o
  **SHA-256** — um vazamento do banco não expõe links válidos. Formato validado antes de consultar o banco.
- Links de recuperação: **uso único** (atualização atômica), **30 minutos**, confirmação por botão (POST) para que
  leitores de e-mail não os consumam, resposta idêntica exista ou não o e-mail e processamento após a resposta (`after`),
  evitando enumeração por tempo.

### Pagamentos

- **Preço sempre recalculado no servidor** a partir do banco; o corpo do pedido é validado por esquema estrito (campos
  extras como `totalCents` são rejeitados); parcelamento validado contra as opções permitidas.
- **Cartão tokenizado no navegador**; o servidor recebe só o token e guarda bandeira e últimos 4 dígitos.
- **CPF** usado só para gerar o boleto e não é armazenado.
- **Webhooks**: HMAC-SHA256 sobre `timestamp.corpo`, janela de 5 minutos (anti-replay), comparação em tempo constante,
  **idempotência** por id do evento e máquina de estados (um evento atrasado não “desfaz” um pagamento).
- O **simulador** de pagamento responde 404 quando desligado e a aplicação se recusa a iniciar com o simulador ligado e
  um provedor real configurado.

### Dados e privacidade (LGPD)

- Minimização: o quiz não pede nome; e-mail só com consentimento explícito; analytics sem dados pessoais e só com
  consentimento; e-mails mascarados no painel.
- Direito de eliminação: botão “Excluir meus dados” no resultado.
- Retenção: `npm run db:cleanup` (quizzes não concluídos > 30 dias, links expirados, e-mails simulados > 30 dias,
  eventos > 365 dias).

### Entrada e dependências

- Todas as entradas validadas com **zod** (limites de tamanho, esquemas `strict`), corpo JSON limitado (64 KB; 512 KB
  para módulos), profundidade de condições limitada.
- Prisma com consultas parametrizadas (sem SQL injection).
- npm 11 com `allowScripts`: apenas pacotes conhecidos executam scripts de instalação, com versões fixadas.
- Código de servidor protegido por `server-only` e por regra de ESLint contra importação em componentes de cliente.

## Checklist antes de produção

- [ ] HTTPS obrigatório; `APP_URL` com o domínio real; `TRUST_PROXY=true` apenas atrás de proxy que sobrescreve
      `X-Forwarded-For`.
- [ ] `PAYMENT_SIMULATOR_ENABLED=false`; `EMAIL_PROVIDER` real (nunca `outbox`); segredos gerados aleatoriamente e
      guardados em cofre (não no repositório).
- [ ] Provedor de pagamento real com validação de assinatura **e de valor** nos webhooks.
- [ ] Rate limiting compartilhado (Redis/Upstash) se houver mais de uma instância.
- [ ] PostgreSQL com backups, criptografia em repouso e usuário com privilégios mínimos.
- [ ] Agendar `npm run db:cleanup`; monitoramento de erros sem registrar dados pessoais.
- [ ] Revisão jurídica da política de privacidade e dos termos; nomear encarregado (DPO).
- [ ] `npm audit` e atualização de dependências periódicas (ex.: Dependabot).
- [ ] 2FA para administradores (evolução recomendada).
