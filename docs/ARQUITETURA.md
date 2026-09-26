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
4. **Configuração em dados, não em código.** Perguntas, pesos, condições, regras, módulos, preços e limites ficam no
   banco e são editados pelo painel.

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
Rule (condição + efeitos em JSON)          Order ─< PaymentEvent (idempotência de webhooks)
Setting (engine | pricing | payment)       Order >─? QuizSession
QuizSession ─< SessionAccessToken          RecoveryToken (links mágicos de recuperação)
AdminUser ─< AdminSession, AuditLog        AnalyticsEvent, EmailOutbox
```

- **Tokens** (resultado, pedido, recuperação, sessão admin) são guardados apenas como hash SHA-256.
- **Resultado congelado**: `QuizSession.resultJson` guarda o resultado calculado na conclusão.
- **Cópia de preço**: `OrderItem` guarda título e preço do momento da compra.
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
