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
  Aulas em vídeo: `frame-src` só para `www.youtube-nocookie.com`, `player.vimeo.com` e `*.tv.pandavideo.com.br`;
  `media-src 'self' https:` para arquivos `.mp4`.
- **Vídeos e links externos cadastrados no painel**: o link de cada aula é convertido para o endereço oficial de
  incorporação (`parseVideoUrl`) e qualquer outro formato é recusado — o painel não consegue incorporar páginas
  arbitrárias. Os iframes usam `sandbox` e `referrerpolicy="strict-origin"` (só a origem, nunca o token da URL das
  páginas privadas). Links de checkout externo (Kiwify) só com `https:` e sem credenciais embutidas
  (`javascript:`, `data:` e `http:` são recusados).
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
- Tokens de resultado têm **escopo**: `owner` (gerencia) e `viewer` (link de compartilhamento, somente leitura).
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
  para módulos, incluindo as aulas), profundidade de condições limitada.
- Scripts locais do curso: a exportação gera HTML com todo o texto escapado e imprime o PDF com o navegador em modo
  headless, com perfil temporário e sem shell; o gerador de vídeos roda só localmente, com recursos do Windows.
- Prisma com consultas parametrizadas (sem SQL injection).
- npm 11 com `allowScripts`: apenas pacotes conhecidos executam scripts de instalação, com versões fixadas.
- Código de servidor protegido por `server-only` e por regra de ESLint contra importação em componentes de cliente.

## Revisão de segurança (setembro/2026)

Revisão manual de todo o código (autenticação, autorização, CSRF, injeção, XSS, pagamentos, privacidade,
disponibilidade e dependências), feita depois da primeira versão. Cada correção tem teste de regressão em
`apps/web/test/security-review.test.ts` (e nos testes de recuperação/E2E quando aplicável).

| # | Severidade | Problema encontrado | Correção |
| - | --- | --- | --- |
| 1 | **Alta** | Sem proxy configurado, todos os limites “por IP” caíam num único balde (`local`): 30 inícios de quiz a cada 10 min **para o site inteiro**, 10 pedidos por 10 min, polling de pedidos e login do admin esgotáveis por qualquer pessoa (negação de serviço). Com proxy que acrescenta IPs (Nginx), o primeiro valor do `X-Forwarded-For` é forjável e burlava os limites. | `TRUST_PROXY_HOPS`: o IP é lido contando saltos a partir da direita do `X-Forwarded-For`; sem proxy o cabeçalho é ignorado. Sem IP confiável, os limites usam chaves que não dá para forjar (sessão, e-mail) e um **limite global alto** apenas como proteção de recursos — nunca um limite apertado compartilhado. |
| 2 | **Alta** | Com `PAYMENT_PROVIDER=mock` em produção, qualquer pessoa pode forjar um token de cartão “aprovado” ou usar o simulador e **liberar conteúdo pago sem pagar**; com `EMAIL_PROVIDER=outbox`, links de acesso ficam gravados no banco e visíveis no painel. | Em produção a aplicação **se recusa a iniciar** com provedores de demonstração, a menos que `ALLOW_DEMO_PROVIDERS=true` seja definido conscientemente. |
| 3 | Média | O link do resultado dava controle total: quem recebesse um link compartilhado podia **trocar o e-mail de recuperação** (sequestrando a recuperação) e **excluir o resultado** — risco real em um produto sobre relacionamentos (parceiro(a) com acesso ao link). | Tokens com **escopo**: `owner` (quem fez o teste: cookie, link pessoal, recuperação) e `viewer` (link de compartilhamento). “Compartilhar (somente leitura)” gera um link que só permite ver; e-mail, novos links e exclusão exigem o escopo de dono. |
| 4 | Média | O corpo das requisições era lido inteiro (`request.text()`) antes da checagem de tamanho: requisições em partes, sem `Content-Length`, podiam esgotar a memória. | `readBodyText` lê em streaming e interrompe assim que o limite é ultrapassado (JSON e webhook). |
| 5 | Média | Em aparelhos compartilhados, “Meu resultado” e a retomada do quiz expõem respostas sensíveis a quem usar o mesmo navegador; não havia como sair rapidamente quando há sinal de risco. | Botão **“Remover deste navegador”** (apaga o cookie; o link pessoal continua valendo) e botão **“Sair rápido”** quando as respostas indicam medo/controle (remove o acesso e troca a página por um site neutro, sem voltar no histórico). |
| 6 | Média | `cookies.delete()` não reenviava `Secure`/`Path`: em produção, o navegador **ignora** a remoção de cookies `__Host-` — “remover deste navegador”, exclusão e logout não limpariam o cookie. | `clearQuizCookie`/`clearAdminCookie` expiram o cookie repetindo os atributos originais. |
| 7 | Baixa | O limitador em memória não tinha teto de chaves: requisições com chaves sempre novas (ex.: e-mails aleatórios na recuperação) cresciam a memória sem limite. | Teto de 50 mil chaves com descarte das mais antigas. |
| 8 | Baixa | Dependências da CLI do Prisma com vulnerabilidades conhecidas (`mysql2` ≤ 3.23, `deepmerge-ts` < 8). Não usadas pelo app em execução, mas presentes no ambiente de desenvolvimento/CI. | `overrides` no `package.json` (mysql2 3.24.4, deepmerge-ts 8.0.2); `npm audit`: **0 vulnerabilidades**. |
| 9 | Baixa | Identificadores de condições/pesos aceitavam qualquer texto (ex.: `__proto__`). | Formato restrito (`[A-Za-z0-9_-]`, sem começar com `__`); o zod também descarta chaves `__proto__`. |

### Pontos avaliados sem problemas

SQL injection (Prisma parametrizado), XSS (sem `dangerouslySetInnerHTML`, markdown sem HTML), CSRF (verificação de
origem em todas as escritas), clickjacking (`frame-ancestors 'none'`), enumeração de e-mails (respostas e tempos
iguais), força bruta de tokens (256 bits), IDOR (todo acesso a resultado/pedido exige token secreto), preço
manipulado pelo navegador (recalculado no servidor), replay de webhook (janela + idempotência), vazamento de token
por `Referer` (`no-referrer`), cache de páginas privadas (`no-store`), injeção de cabeçalho em e-mails (assunto fixo,
destinatário validado), SSRF (sem requisições para URLs informadas pelo usuário), bypass do `proxy.ts` (autorização
repetida em cada página/rota).

### Riscos aceitos e recomendações

- **Bloqueio de conta como negação de serviço:** quem souber o e-mail do administrador pode mantê-lo bloqueado
  (5 tentativas → 15 min). É o compromisso usual contra força bruta; com `TRUST_PROXY_HOPS` configurado o limite por
  IP reduz o efeito. Recomendado: 2FA para administradores.
- **Links pessoais nunca expiram:** o link de dono funciona até o resultado ser excluído (é o que permite voltar a ele
  meses depois). Evolução possível: listar e revogar links na página do resultado.
- **Servidor de desenvolvimento acessível na rede local:** o `next dev` escuta em todas as interfaces (útil para testar
  no celular). Em redes não confiáveis, use `npm run dev -- -H localhost`.
- **`style-src-attr 'unsafe-inline'`:** necessário para larguras dinâmicas das barras; atributos de estilo não executam
  código.
- **Webhooks de provedor real:** além da assinatura, confira valor e moeda do evento com o pedido.

## Checklist antes de produção

- [ ] HTTPS obrigatório; `APP_URL` com o domínio real; `TRUST_PROXY_HOPS` igual ao número de proxies confiáveis
      na frente da aplicação.
- [ ] `PAYMENT_SIMULATOR_ENABLED=false`; provedores reais de pagamento e e-mail (sem `ALLOW_DEMO_PROVIDERS`);
      segredos gerados aleatoriamente e guardados em cofre (não no repositório).
- [ ] Provedor de pagamento real com validação de assinatura **e de valor** nos webhooks.
- [ ] Rate limiting compartilhado (Redis/Upstash) se houver mais de uma instância.
- [ ] PostgreSQL com backups, criptografia em repouso e usuário com privilégios mínimos.
- [ ] Agendar `npm run db:cleanup`; monitoramento de erros sem registrar dados pessoais.
- [ ] Revisão jurídica da política de privacidade e dos termos; nomear encarregado (DPO).
- [ ] `npm audit` e atualização de dependências periódicas (ex.: Dependabot).
- [ ] 2FA para administradores (evolução recomendada).
- [ ] Se vender pela Kiwify: conferir que cada link de checkout cadastrado no painel abre a oferta certa e que os
      grupos da área de membros liberam só o módulo comprado (compra de teste + reembolso).
