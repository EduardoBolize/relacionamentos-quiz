# Arquitetura

## Princípios

1. **Regras de negócio puras e testáveis.** O `QuizEngine` não acessa banco, rede, relógio nem framework: recebe a
   definição do quiz e as respostas e devolve fluxo, progresso e resultado. É o coração do produto e o trecho com
   mais testes.
2. **Dependências apontam para dentro.** `apps/web` depende dos pacotes; os pacotes não dependem do app. Pagamentos e
   analytics são expostos por **interfaces** (`PaymentGateway`, `AnalyticsTracker`, `EmailProvider`) com
   implementações trocáveis.
3. **Servidor é a fonte da verdade.** Pontuação, preços, validação de respostas e liberação de conteúdo acontecem no
   servidor. O navegador recebe apenas o necessário para exibir a pergunta atual (sem pesos nem regras).
4. **Configuração em dados, não em código.** Perguntas, pesos, condições, regras, módulos, aulas em vídeo, preços,
   oferta do curso, respostas às objeções e limites ficam no banco e são editados pelo painel.

## Camadas do app web

```
Navegador ──HTTP──► src/app/api/**/route.ts  (camada HTTP: autenticação, CSRF, rate limit, zod)
                          │
                          ▼
                    src/server/services/*    (casos de uso: quiz, resultado, checkout, webhooks, admin)
                          │
          ┌───────────────┼──────────────────┬──────────────────┐
          ▼               ▼                  ▼                  ▼
   quiz-engine       payments           analytics             db (Prisma)
```

As páginas (Server Components) chamam os mesmos serviços diretamente; componentes de cliente só conversam com a API.
Uma regra de ESLint impede que código de cliente importe `@/server/*`, o banco ou a parte de servidor de pagamentos.

## Modelo de dados (resumo)

```
Category ─┬─< OptionWeight >─ Option >─ Question >─ Stage ─? BookModule (módulo ofertado na etapa)
          └─< ModuleCategory >─ BookModule ─< OrderItem >─ Order ─< OrderAccessToken
                                BookModule ─< ModuleVideo (aulas: roteiro, destaques, link do vídeo)
Rule (condição + efeitos em JSON)          Order ─< PaymentEvent (idempotência de webhooks)
Setting (engine | pricing | payment | course | objections)
                                           Order >─? QuizSession
QuizSession ─< SessionAccessToken          RecoveryToken (links mágicos de recuperação)
AdminUser ─< AdminSession, AuditLog        AnalyticsEvent, EmailOutbox
```

- **Tokens** (resultado, pedido, recuperação, sessão admin) são guardados apenas como hash SHA-256.
- **Resultado congelado**: `QuizSession.resultJson` guarda o resultado calculado na conclusão.
- **Cópia de preço**: `OrderItem` guarda título e preço do momento da compra.
- **Oferta**: `src/server/offer.ts` calcula, a partir do cadastro, o preço "a partir de", o valor do curso completo
  (mesmo cálculo do checkout), as parcelas, a garantia e o destino dos botões de compra (checkout do site ou link
  externo cadastrado em `BookModule.checkoutUrl` / `course.fullCourseCheckoutUrl`). As respostas às objeções
  (`objections`) usam marcadores como `{preco_curso}`, trocados por esses valores.
- SQLite em desenvolvimento (modo WAL); campos JSON como texto e “enums” como strings validadas → migração simples
  para PostgreSQL.

## Fluxos principais

### Responder o quiz

```
Navegador                      API /quiz/session/answer            quiz-service              QuizEngine
   │  POST {stepId, optionIds}  │                                     │                          │
   │ ─────────────────────────► │ assertSameOrigin + rate limit       │                          │
   │                            │ cookie → sessão (hash do token) ──► │ transação: lê respostas  │
   │                            │                                     │ ───── applyAnswer ─────► │ valida passo/opções
   │                            │                                     │ grava respostas          │
   │                            │                                     │ ── getStepAfter/isComplete ─►
   │                            │                                     │ concluído? computeResult ►│
   │ ◄──── próximo passo (DTO sem pesos) ou { completed, resultPath } │                          │
```

### Pagamento com Pix

```
checkout ─► POST /checkout/orders ─► preço recalculado no servidor ─► Order(pending) ─► gateway.createCharge
        ◄── /pedido/<token> (QR Code, copia e cola, validade; página consulta o status a cada 4 s)
provedor ─► POST /webhooks/payments ─► assinatura HMAC ─► PaymentEvent (idempotência) ─► Order(paid)
        ─► novo link de acesso por e-mail ─► conteúdo liberado em /pedido/<token>/modulos/<slug>
```

### Material do curso para a Kiwify

```
banco (módulos, aulas, oferta, objeções) ─► apps/web/scripts/exportar-curso.ts ─► curso-kiwify/
   modulos/NN-slug/ (descrição, roteiros, texto .md/.html/.pdf), estrutura.csv, aulas.json, textos de venda
aulas.json ─► apps/web/scripts/gerar-videos-rascunho.ps1 (Windows: SAPI + GDI+ + Windows.Media.Editing)
   ─► curso-kiwify/videos-rascunho/ (MP4 720p + slides PNG; fora do Git)
```

## Decisões

| Decisão | Motivo |
| --- | --- |
| Next.js (App Router) em um único app | Um deploy para site, API e painel; Server Components acessam serviços diretamente. |
| Motor em pacote TypeScript puro | Testes rápidos e isolados; reutilizável em outro backend/app no futuro. |
| Prisma 7 + SQLite (WAL) | Zero instalação em desenvolvimento; caminho claro para PostgreSQL. |
| Sessões em banco (não JWT) | Revogação imediata (logout, troca de senha, bloqueio). |
| Tokens aleatórios + hash | Links compartilháveis sem expor dados se o banco vazar. |
| Webhook como única fonte de confirmação assíncrona | Mesmo caminho para simulador e provedor real; idempotente. |
| Condições avaliadas “para frente” | Sem ciclos; respostas de perguntas ocultadas são descartadas na conclusão. |
| Normalização por perguntas respondidas | Temas com mais perguntas não dominam; resultado comparável entre temas. |
| Analytics com consentimento e sem PII | LGPD; métricas de negócio vêm de dados operacionais agregados. |
| Uma categoria por módulo do curso | O tema principal aponta direto para o módulo ideal; regras complementam (amor-próprio como raiz, módulo do momento). |
| Objeções como sinalizadores de regra | Reaproveita o motor (sem código novo): a resposta vira `objecao_*` e o texto fica editável no painel. |
| Vídeos por link, não por upload | O site não hospeda nem transcodifica vídeo; YouTube/Vimeo/Panda/Kiwify fazem isso melhor. Lista fechada de players. |
| Checkout externo opcional por módulo | Permite vender pela Kiwify sem integrar API de pagamento; o checkout próprio continua para o resto. |
