# Entre Nós — quiz adaptativo de relacionamento

Aplicação web cujo núcleo é um **quiz adaptativo** que identifica, com cuidado, quais temas mais pesam no
relacionamento da pessoa (comunicação, confiança, conflitos, intimidade, dinheiro, limites…) e a direciona para a
**seção (módulo) mais relevante de um livro**, com prévia gratuita, pergunta de concordância com o valor e checkout
por **Pix, boleto ou cartão** (simulados, prontos para trocar por um provedor real).

> O quiz **não é um diagnóstico**. Ele mostra quais temas apareceram mais nas respostas e oferece conteúdo
> educativo. Quando as respostas indicam medo ou controle, o resultado mostra primeiro **canais de apoio**
> (CVV 188, Ligue 180, Disque 100, 190), antes de qualquer oferta.

A experiência do quiz foi inspirada no fluxo da análise de perfil da AUVP (uma pergunta por tela, escala de 0 a 5,
botões grandes, atalhos de teclado, fundo escuro) — com identidade visual própria.

---

## Sumário

- [Destaques](#destaques)
- [Como rodar](#como-rodar)
- [Arquitetura](#arquitetura)
- [Como o quiz funciona](#como-o-quiz-funciona)
- [Guia de conteúdo: perguntas, respostas, categorias e módulos](#guia-de-conteúdo)
- [Conteúdo de demonstração](#conteúdo-de-demonstração)
- [Pagamentos (simulados) e como usar um provedor real](#pagamentos)
- [Recuperação de resultado](#recuperação-de-resultado)
- [Analytics e LGPD](#analytics-e-lgpd)
- [Testes](#testes)
- [Segurança](#segurança)
- [Evoluindo para um livro real](#evoluindo-para-um-livro-real)
- [Estrutura de pastas](#estrutura-de-pastas)

---

## Destaques

| Área | O que tem |
| --- | --- |
| **Quiz** | Uma pergunta por vez, progresso visível por etapa, voltar/avançar, atalhos (A, B, C… / 0–5 / Enter), retomada automática de onde parou, escolha única, múltipla e escala. |
| **Adaptativo** | Perguntas e etapas com condições (por resposta anterior ou pela pontuação parcial de um tema). |
| **Pergunta de valor** | Ao final de cada etapa, a seção do livro relacionada aparece com preço e a pessoa responde se **concorda com o valor** (sem cobrança). A resposta pré-seleciona o carrinho e alimenta as estatísticas de preço. |
| **QuizEngine** | Motor puro em TypeScript: pontuação normalizada (0–100), regras condicionais, categoria principal, secundárias e módulos recomendados. |
| **Resultado** | Explicações cuidadosas (não diagnósticas), pontuação de todos os temas, prévia dos módulos, CTA, envio por e-mail, link de compartilhamento **somente leitura**, “remover deste navegador”, **saída rápida** quando há sinal de risco e exclusão dos dados (LGPD). |
| **Checkout** | Pix (QR Code + copia e cola + validade), boleto (linha digitável) e cartão (tokenizado no navegador, parcelamento), desconto de combo, webhooks assinados. |
| **Painel admin** | Categorias, etapas, perguntas com **grade de pesos**, construtor visual de **regras/condições**, módulos (markdown com pré-visualização), preços com taxa de aceitação, configurações, pedidos, e-mails simulados e auditoria — **sem mexer no código**. |
| **Qualidade** | 191 testes unitários/integração + 8 E2E (celular e desktop), ESLint, TypeScript estrito, build de produção sem avisos, `npm audit` sem vulnerabilidades. |
| **Segurança** | CSP com nonce, cookies HttpOnly/`__Host-`, proteção CSRF, rate limiting, tokens com hash, scrypt, auditoria, validação com zod em todas as entradas. |
| **Acessibilidade** | Mobile-first, HTML semântico (radios/checkboxes nativos), foco gerenciado, `aria-live`, barras de progresso acessíveis, contraste AA, `prefers-reduced-motion`. |

---

## Como rodar

**Pré-requisitos:** Node.js **22.12+** (recomendado **24**, veja `.nvmrc`) e npm 10+.

```bash
npm install
```

> O npm 11 bloqueia scripts de instalação por padrão. As dependências que precisam deles (Prisma, better-sqlite3,
> esbuild) já estão aprovadas, com versão fixa, em `allowScripts` no `package.json` da raiz.

Crie o arquivo de ambiente e preencha os segredos (veja os comentários no arquivo):

```bash
cp .env.example .env
```

Para gerar valores aleatórios (use para `PAYMENT_WEBHOOK_SECRET` e escolha uma senha forte para `ADMIN_PASSWORD`):

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('base64url'))"
```

Prepare o banco (gera o cliente Prisma, aplica as migrações e grava o conteúdo de demonstração + o administrador):

```bash
npm run setup
```

Suba o servidor de desenvolvimento:

```bash
npm run dev
```

- Site: <http://localhost:3000>
- Painel: <http://localhost:3000/admin> (login com `ADMIN_EMAIL` / `ADMIN_PASSWORD` do `.env`)

### Scripts

| Comando | O que faz |
| --- | --- |
| `npm run dev` | Servidor de desenvolvimento (Next.js + Turbopack). |
| `npm run build` / `npm start` | Build e servidor de produção. |
| `npm run setup` | `db:generate` + `db:deploy` + `db:seed`. |
| `npm run db:migrate` | Cria/aplica migrações após mudar `packages/db/prisma/schema.prisma`. |
| `npm run db:seed` | Grava o conteúdo de demonstração (não sobrescreve um banco com conteúdo). `-- --force` restaura a demonstração. |
| `npm run db:studio` | Abre o Prisma Studio para inspecionar o banco. |
| `npm run db:cleanup` | Retenção de dados (apaga quizzes não concluídos antigos, links expirados etc.). `-- --dry-run` só mostra. |
| `npm run admin:create -- --email pessoa@exemplo.com` | Cria administrador (senha pedida no terminal). `--reset-password` troca a senha e encerra sessões. |
| `npm test` | Todos os testes unitários e de integração. |
| `npm run test:e2e` | Testes de ponta a ponta (Playwright) contra o build de produção. |
| `npm run typecheck` / `npm run lint` | Verificação de tipos e ESLint. |

---

## Arquitetura

Monorepo com **npm workspaces**. Cada preocupação vive em um pacote separado, com dependências apontando
sempre “para dentro” (o motor não conhece banco, framework nem pagamento):

```
apps/web  (Next.js 16 — frontend, API, painel admin)
  ├── src/app ............ páginas e rotas de API (camada HTTP fina)
  ├── src/components ..... interface (quiz, resultado, checkout, admin)
  └── src/server ......... serviços de aplicação, segurança, e-mail, integração dos pacotes
        │
        ├──► packages/quiz-engine   regras de pontuação e recomendação (TypeScript puro)
        ├──► packages/payments      contrato PaymentGateway, precificação, gateway simulado
        ├──► packages/analytics     catálogo de eventos (sem dados pessoais) e adaptadores
        └──► packages/db            Prisma (schema, migrações, cliente), carga da definição, seed
```

| Pacote | Responsabilidade | Depende de |
| --- | --- | --- |
| `@relacionamentos/quiz-engine` | `QuizEngine`: fluxo adaptativo, pontuação, regras, recomendação, validação da configuração. | zod |
| `@relacionamentos/payments` | Interface `PaymentGateway`, cálculo de preço/parcelas, webhooks HMAC, gateway **mock** (Pix/boleto/cartão), tokenizador de cartão para o navegador. | qrcode |
| `@relacionamentos/analytics` | Eventos tipados e validados, rastreadores (consentimento, composição, tolerância a falhas), funil. | zod |
| `@relacionamentos/db` | Esquema Prisma (SQLite em dev), cliente, `loadQuizDefinition`, hash de senha, seed e scripts. | quiz-engine, Prisma |
| `@relacionamentos/web` | Next.js: páginas, API, painel, segurança, e-mail. | todos acima |

Mais detalhes (modelo de dados, fluxos e decisões) em [`docs/ARQUITETURA.md`](docs/ARQUITETURA.md).

---

## Como o quiz funciona

1. **Etapas e perguntas.** O quiz é dividido em etapas (ex.: “Como vocês conversam”). Cada etapa tem perguntas de
   escolha única, múltipla escolha ou escala 0–5, exibidas **uma por vez**.
2. **Pesos.** Cada opção soma pontos (−10 a 10) em uma ou mais **categorias** (temas).
3. **Normalização.** A pontuação de cada tema vai de 0 a 100: *pontos obtidos ÷ máximo possível* considerando só as
   perguntas respondidas. Assim, temas com mais perguntas não dominam o resultado.
4. **Adaptatividade.** Etapas e perguntas podem ter **condições** — por resposta anterior (“se mora junto”) ou pela
   pontuação parcial de um tema (“se Comunicação ≥ 50”). As condições só olham para passos anteriores, então não há
   dependências circulares; respostas de perguntas que deixaram de aparecer são descartadas.
5. **Pergunta de valor.** Ao fim de cada etapa ligada a um módulo, a pessoa vê a seção do livro (prévia, destaques e
   preço) e responde: *concordo com o valor* / *quero ver a prévia* / *não concordo*. É possível exigir uma
   relevância mínima do tema para exibir a pergunta.
6. **Regras condicionais.** Após a pontuação, regras podem **somar** ou **multiplicar** pontos, **recomendar** um
   módulo ou adicionar **sinalizadores** (ex.: `safety_support`, que mostra canais de apoio antes das ofertas).
7. **Recomendação (QuizEngine).** Retorna a **categoria principal** (se atingir o mínimo configurado), as
   **secundárias**, todas as **pontuações** e os **módulos recomendados** (tema principal → secundários → regras →
   módulos cujo valor a pessoa aceitou), com sugestão de pré-seleção no checkout.
8. **Resultado congelado.** Na conclusão, o resultado é salvo; mudanças futuras nos pesos não alteram resultados antigos.

```ts
import { QuizEngine } from '@relacionamentos/quiz-engine';

const engine = new QuizEngine(definition);          // montada a partir do banco
const step = engine.getNextStep(answers);            // próximo passo visível
answers = engine.applyAnswer(answers, step.id, ['opcao']); // valida e registra
const result = engine.computeResult(answers);
// result.primary, result.secondary, result.scores, result.recommendedModules, result.flags
```

---

## Guia de conteúdo

Tudo abaixo é feito pelo **painel** (`/admin`), sem mexer em código. As mudanças valem imediatamente para novos
testes (o cache da definição é invalidado a cada alteração). A página inicial do painel mostra a **Verificação da
configuração**, que acusa erros como condições apontando para perguntas inexistentes.

### Adicionar ou editar uma categoria (tema)

**Painel → Categorias → “+ Nova categoria”**

- **Nome** e **identificador (slug)**, ex.: `rotina`.
- **Descrição curta** (aparece na lista de pontuações) e **explicação cuidadosa** (aparece quando o tema se destaca).
  Escreva sem rótulos nem tom de diagnóstico: fale de possibilidades, acolhimento e próximos passos.
- **Cor** (barras do resultado) e **ordem** (critério de desempate).
- Depois, dê pesos a ela nas perguntas e ligue-a a um módulo — senão a verificação avisa que o tema nunca pontua.

### Adicionar uma etapa

**Painel → Etapas → “+ Nova etapa”**

- **Título**, **descrição** e **ordem**.
- **Módulo relacionado**: habilita a pergunta de concordância com o valor ao final da etapa.
- **Relevância mínima (0–100)**: `0` pergunta sempre; `40` só pergunta se algum tema do módulo pontuar ≥ 40.
- **Condição de exibição** (opcional): mostra a etapa inteira só em certos casos.

### Adicionar uma pergunta e suas respostas (opções e pesos)

**Painel → Perguntas e pesos → “+ Nova pergunta”**

1. Escolha a **etapa**, o **tipo** (escolha única, múltipla escolha ou escala 0–5) e a **ordem**.
2. Escreva o **enunciado** e, se quiser, um texto de apoio. Na múltipla escolha, defina o máximo de opções marcadas.
   Na escala, preencha os rótulos do 0 e do 5 e use **“Gerar escala 0–5”**.
3. Na **grade de pesos**, cada linha é uma opção e cada coluna uma categoria. Exemplo:

   | Opção | Comunicação | Conflitos |
   | --- | --- | --- |
   | Falo com calma e a gente resolve | 0 | 0 |
   | Guardo para mim para evitar briga | 3 | 1 |
   | Acumulo até explodir | 2 | 3 |

   Deixe 0 onde a opção não diz nada sobre o tema. Pesos negativos são permitidos (−10 a 10).
4. **Condição de exibição** (opcional), com o construtor visual:
   - *resposta*: “`Como vocês organizam as finanças?` foi respondida, mas NÃO com `Cada um cuida do seu`”;
   - *pontuação*: “Pontuação de `Comunicação` ≥ `50`”;
   - combine cláusulas com **TODAS** / **QUALQUER uma** e use **NÃO** para negar. Para grupos aninhados, use
     **“Editar como JSON”** (validado no servidor).

> Editar uma opção existente mantém o seu identificador, então regras e respostas que apontam para ela continuam
> funcionando. Excluir uma pergunta quebra regras que dependem dela — prefira **desativar**.

### Criar uma regra condicional

**Painel → Regras → “+ Nova regra”**: defina **quando** (mesmo construtor de condições; cláusulas de pontuação usam
a pontuação base, antes de qualquer regra) e **efeitos**:

| Efeito | Exemplo |
| --- | --- |
| Somar pontos | “Ciúme com controle” → +10 em *Limites* |
| Multiplicar | “Mora junto e rotina pesada” → *Intimidade* × 1,15 |
| Recomendar módulo | “Acumula até explodir e conflitos ≥ 50” → recomendar *Comunicação que aproxima* |
| Sinalizador | “Sente medo das reações” → `safety_support` (canais de apoio em destaque) |

Regras de **prioridade** maior aplicam seus efeitos primeiro (importa ao combinar soma e multiplicação).

### Adicionar um módulo (seção do livro)

**Painel → Módulos do livro → “+ Novo módulo”**

- **Título, subtítulo, slug** (endereço público `/modulos/slug`), **emoji da capa**, **preço**.
- **Categorias relacionadas**: definem quando o módulo é recomendado.
- **Prévia gratuita** e **conteúdo completo** (liberado após o pagamento) em markdown simples: `## título`,
  `### subtítulo`, `- lista`, `> citação`, `**negrito**`, `*itálico*`. HTML não é permitido (proteção contra XSS);
  use **Pré-visualizar** para conferir.
- Módulos já vendidos não podem ser excluídos — desative-os.

### Preços e descontos

**Painel → Preços**: edite o preço de cada seção ao lado da **taxa de concordância** registrada nas perguntas de
valor e do número de vendas. Na mesma página: desconto de combo (a partir de N módulos), parcelas sem juros e
parcela mínima. O checkout **sempre** recalcula o total no servidor com esses valores.

### Editar o conteúdo pelo código (opcional)

O conteúdo inicial está em [`packages/db/seed/demo-content.ts`](packages/db/seed/demo-content.ts), com ids legíveis
(`cat_comunicacao`, `q_status`, `opt_status_juntos`…). Depois de editar:

```bash
npm run db:seed -- --force
```

O seed usa `upsert` (não duplica) e **sobrescreve** os itens de demonstração com os valores do arquivo.

---

## Conteúdo de demonstração

O projeto vem com o livro fictício **“Entre Nós — guia prático para relações mais leves”**:

- **6 categorias:** Comunicação · Confiança e segurança emocional · Conflitos e discussões · Intimidade e conexão ·
  Dinheiro a dois · Limites e individualidade.
- **6 módulos** (R$ 19,90 a R$ 29,90), cada um com prévia e conteúdo completo de demonstração.
- **7 etapas e 20 perguntas**, incluindo perguntas condicionais (controle só aparece se o ciúme é frequente;
  tensão financeira só para quem divide despesas; rotina da casa só para quem mora junto; assuntos evitados só se
  Comunicação ≥ 50).
- **5 regras**, incluindo o sinal de cuidado que prioriza canais de apoio.
- Configurações: tema principal ≥ 35, secundários ≥ 30 (até 2), desconto de 15% a partir de 2 módulos, até 3x.

O próprio conteúdo é testado (`packages/db/test/demo-content.test.ts`): a configuração não tem erros e os caminhos
principais produzem os resultados esperados.

---

## Pagamentos

Nesta versão os pagamentos são **simulados** (`PAYMENT_PROVIDER=mock`), mas seguem o mesmo fluxo de um provedor real:

| Método | Simulação |
| --- | --- |
| **Pix** | QR Code + “copia e cola” no formato EMV, com um identificador de arranjo **fictício** (nenhum banco consegue pagar), e validade configurável. |
| **Boleto** | Linha digitável e código de barras no layout FEBRABAN com banco fictício `000`; exige CPF válido (não armazenado). |
| **Cartão** | Dados tokenizados **no navegador** — número e CVV nunca chegam ao servidor. Cartões de teste: `4111 1111 1111 1111` e `5555 5555 5555 4444` (aprovados), `4000 0000 0000 0002` (recusado), `5105 1051 0510 5100` (saldo insuficiente). Qualquer outro número é recusado. |

Pix e boleto ficam **pendentes** até a confirmação por **webhook** (`POST /api/webhooks/payments`, assinado com
HMAC-SHA256 + timestamp, com idempotência por id de evento). Em desenvolvimento, a página do pedido tem um
**simulador** que dispara esse webhook (aprovado, recusado ou expirado). Desligue com `PAYMENT_SIMULATOR_ENABLED=false`.

### Trocando por um provedor real (Mercado Pago, Pagar.me, Asaas, Stripe, Efí…)

1. Crie `packages/payments/src/<provedor>/<provedor>-gateway.ts` implementando `PaymentGateway`:
   - `createCharge(input)` → chama a API do provedor e devolve `Charge` (Pix: `copyPasteCode`/`qrCodeDataUrl`;
     boleto: `digitableLine`; cartão: `status` `paid`/`failed`, bandeira e últimos 4 dígitos);
   - `parseWebhook(rawBody, headers)` → valida a **assinatura do provedor** e converte para `WebhookEvent`
     (`charge.paid`, `charge.failed`, `charge.expired`, `charge.refunded`…). Confira também valor e moeda.
2. Registre o provedor em `createPaymentGateway` (`packages/payments/src/gateway.ts`).
3. No checkout (`apps/web/src/components/checkout/CheckoutForm.tsx`), troque `tokenizeCardMock` pelo **SDK do
   provedor** (ex.: `createCardToken`). O contrato com o servidor não muda: só `cardToken` + `installments`.
4. Configure `PAYMENT_PROVIDER`, as chaves do provedor (como variáveis de ambiente, nunca no código), a URL do webhook
   no painel do provedor e `PAYMENT_SIMULATOR_ENABLED=false`.
5. Teste no **sandbox** do provedor antes de ativar produção.

Nada nas telas, nos serviços de pedido ou no QuizEngine precisa mudar.

---

## Recuperação de resultado

- **Mesmo navegador:** a sessão fica em um cookie `HttpOnly`; o quiz retoma de onde parou e **“Meu resultado”** abre o
  último resultado.
- **Link pessoal:** cada resultado tem um link secreto (`/resultado/<token de 256 bits>`); no banco fica só o hash.
  Ele permite gerenciar o resultado (e-mail, exclusão), por isso não deve ser compartilhado.
- **Compartilhar:** “Compartilhar (somente leitura)” gera outro link, que só permite **ver** o resultado.
- **Aparelho compartilhado:** “Remover deste navegador” apaga o acesso local; quando as respostas indicam medo ou
  controle, o botão **“Sair rápido”** remove o acesso e troca a página por um site neutro.
- **E-mail (opcional, com consentimento):** a pessoa pode receber o link e, depois, pedir em `/recuperar` um
  **link mágico** (válido por 30 min, uso único, confirmado por botão para que leitores de e-mail não o consumam).
  A resposta é sempre a mesma, exista ou não o e-mail (sem enumeração).
- Em desenvolvimento, os e-mails ficam em **Painel → E-mails (simulação)**.

---

## Analytics e LGPD

- **Métricas de uso só com consentimento** (banner). Eventos têm catálogo fixo e esquemas estritos — nunca incluem
  nome, e-mail, CPF ou o conteúdo das respostas; a sessão é identificada por pseudônimo.
- Indicadores de negócio do painel (testes, pedidos, receita, aceitação de preço) vêm de dados operacionais agregados.
- A pessoa pode **excluir** respostas e resultado na página do resultado; `npm run db:cleanup` aplica a retenção.
- Adaptadores: banco próprio (padrão) e console; para GA4/PostHog/Segment, crie um `AnalyticsTracker` e adicione-o
  em `apps/web/src/server/analytics.ts`.
- A política em `/privacidade` é um **texto de demonstração**: revise com assessoria jurídica antes de publicar.

---

## Testes

```bash
npm test            # 191 testes: motor, pagamentos, analytics, conteúdo e integração do app
npm run test:e2e    # 8 cenários E2E (celular e desktop) contra o build de produção
```

| Suíte | Cobre |
| --- | --- |
| `packages/quiz-engine/test` (65) | Pontuação e normalização, **regras condicionais** (soma, multiplicação, prioridade, sinalizadores), **fluxo** (ordem, adaptatividade, voltar, validação, progresso), recomendação e validação da configuração. |
| `packages/payments/test` (35) | Preço/desconto/parcelas, cartão (Luhn, bandeira, validade, tokenização), CPF, Pix (EMV/CRC16), boleto (FEBRABAN), assinatura de webhook. |
| `packages/analytics/test` (8) | Catálogo estrito, consentimento, tolerância a falhas, funil. |
| `packages/db/test` (8) | Conteúdo de demonstração válido e com os resultados esperados. |
| `apps/web/test` (75) | **Fluxo do quiz** via serviços reais e banco de teste, **recuperação de resultado** (link, e-mail, link mágico, expiração, uso único, limite), checkout, webhooks (idempotência, assinatura, transições), admin (login, bloqueio, sessões, CSRF, CRUD), segurança e as regressões da revisão de segurança. |
| `apps/web/e2e` (8) | Jornada completa (landing → quiz → resultado → Pix → conteúdo), cartão recusado, painel (preço sem código) e cabeçalhos de segurança. |

Os testes de integração usam `data/test.db` e os E2E `data/e2e.db` — o banco de desenvolvimento nunca é tocado.
Para o E2E, instale o Chromium (`npx playwright install chromium`) ou use um navegador já instalado:
`PLAYWRIGHT_CHANNEL=msedge npm run test:e2e` (ou `chrome`).

---

## Segurança

Resumo dos controles (detalhes, modelo de ameaças e recomendações para produção em
[`docs/SEGURANCA.md`](docs/SEGURANCA.md)):

- **CSP com nonce por requisição** (`src/proxy.ts`), `X-Frame-Options: DENY`, HSTS, `nosniff`, `Permissions-Policy`;
  páginas privadas com `no-store`, `no-referrer` e `noindex`.
- **Cookies** `HttpOnly`, `SameSite` e prefixo `__Host-` em produção; **CSRF**: verificação de `Origin`/`Sec-Fetch-Site`
  + `Content-Type: application/json` em toda escrita.
- **Tokens** de 256 bits; no banco só o **hash SHA-256**. Senhas com **scrypt** (parâmetros OWASP), bloqueio após 5
  falhas, limites por IP e por e-mail, respostas genéricas, sessões com expiração e inatividade, **auditoria**.
- **Preço sempre calculado no servidor**; webhooks com **HMAC + janela de tempo + idempotência**; cartão tokenizado.
- Entradas validadas com **zod** (esquemas estritos, limites de tamanho lidos em streaming); markdown sem HTML (sem
  XSS); Prisma parametrizado (sem SQL injection).
- **Rate limiting** que não confia em `X-Forwarded-For` forjável (`TRUST_PROXY_HOPS`) e nunca vira um limite global
  apertado; links de compartilhamento **somente leitura**; produção **não inicia** com provedores de demonstração
  (`ALLOW_DEMO_PROVIDERS`); `npm audit` sem vulnerabilidades.

A **revisão de segurança** completa (9 problemas encontrados e corrigidos, pontos verificados e riscos aceitos) está
em [`docs/SEGURANCA.md`](docs/SEGURANCA.md#revisão-de-segurança-setembro2026).

---

## Evoluindo para um livro real

1. **Conteúdo:** substitua prévia e conteúdo completo de cada módulo (Painel → Módulos) pelos capítulos reais.
   Revise perguntas, pesos e textos das categorias com um(a) **psicólogo(a)/terapeuta de casal** — o motor é
   configurável justamente para isso. Ajuste preços usando a taxa de concordância da página **Preços**.
2. **Pagamentos reais:** siga [Trocando por um provedor real](#trocando-por-um-provedor-real-mercado-pago-pagarme-asaas-stripe-efí).
3. **E-mail real:** implemente `EmailProvider` em `apps/web/src/server/email.ts` (Amazon SES, Resend, Postmark…) e
   configure SPF/DKIM/DMARC no domínio.
4. **Banco em produção:** troque o `provider` do `schema.prisma` para `postgresql`, instale `@prisma/adapter-pg`,
   ajuste `packages/db/src/client.ts` e gere novas migrações. Os campos JSON são texto e os “enums” são strings — a
   migração é direta.
5. **Contas de leitor (opcional):** hoje o acesso ao conteúdo é por link secreto enviado por e-mail. Para biblioteca
   pessoal, adicione login (ex.: link mágico por e-mail) e associe pedidos ao usuário.
6. **Infra:** execute em HTTPS atrás de proxy confiável (`TRUST_PROXY_HOPS`), use Redis para o rate limiting com várias
   instâncias, agende `npm run db:cleanup`, configure backups e monitoramento de erros.
7. **Jurídico:** termos de compra, política de privacidade (controlador, encarregado/DPO, bases legais), direito de
   arrependimento (CDC, art. 49) e nota fiscal.
8. **Formatos:** o mesmo módulo pode gerar PDF/EPUB para download após a compra (novo campo de arquivo no módulo).

---

## Estrutura de pastas

```
.
├── apps/web/                      # Next.js (frontend, API, painel)
│   ├── src/app/                   # páginas e rotas (api/, admin/, quiz/, resultado/, checkout/, pedido/…)
│   ├── src/components/            # quiz/, result/, checkout/, admin/, site/, ui/
│   ├── src/server/                # services/, auth/, security/, email, analytics, payments, env
│   ├── src/proxy.ts               # CSP com nonce + barreira do /admin
│   ├── test/                      # testes de integração (Vitest + banco de teste)
│   └── e2e/                       # testes de ponta a ponta (Playwright)
├── packages/
│   ├── quiz-engine/               # QuizEngine (pontuação, regras, recomendação)
│   ├── payments/                  # PaymentGateway, precificação, gateway simulado
│   ├── analytics/                 # eventos e rastreadores
│   └── db/                        # Prisma (schema, migrações), seed de demonstração, scripts
├── docs/                          # ARQUITETURA.md, SEGURANCA.md
├── data/                          # bancos SQLite locais (ignorados pelo Git)
└── .env.example                   # variáveis de ambiente documentadas
```
