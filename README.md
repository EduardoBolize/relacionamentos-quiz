# Fórmula do Amor — quiz que indica o módulo ideal do curso

Site do curso **Fórmula do Amor** (método de Miguel Palhares). O núcleo é um **quiz adaptativo** que entende o
momento da pessoa (solteira, de olho em alguém, namorando, em crise ou depois do término) e o que a faz hesitar, e
indica o **melhor módulo para começar** entre os **8 módulos** do curso. Cada módulo tem **3 aulas em vídeo de cerca de
1 minuto** e um **texto prático** com exercícios.

- Preço **diluído**: **R$ 15 por módulo**; o curso completo sai pelo **valor cheio de R$ 120** (parcelável).
- Checkout próprio por **Pix, boleto ou cartão** (simulado, pronto para trocar por um provedor real) **ou** link de
  checkout externo por módulo e para o curso completo, por exemplo da **Kiwify**.
- Material do curso separado e pronto para subir na Kiwify em [`curso-kiwify/`](curso-kiwify/LEIA-ME.md), com o
  [passo a passo](curso-kiwify/COMO-SUBIR-NA-KIWIFY.md).

> O quiz **não é um diagnóstico**. Ele mostra quais temas apareceram mais nas respostas e indica conteúdo educativo.
> Quando as respostas indicam medo, humilhação, ameaça ou agressão, o resultado mostra primeiro **canais de apoio**
> (Ligue 180, CVV 188, Disque 100, 190) e um botão de **saída rápida**, antes de qualquer oferta.

A experiência do quiz foi inspirada no fluxo da análise de perfil da AUVP (uma pergunta por tela, escala de 0 a 5,
botões grandes, atalhos de teclado, fundo escuro), com identidade visual própria.

---

## Sumário

- [Destaques](#destaques)
- [Como rodar](#como-rodar)
- [O curso Fórmula do Amor](#o-curso-fórmula-do-amor)
- [Aulas em vídeo](#aulas-em-vídeo)
- [Kiwify: material do curso e checkout externo](#kiwify-material-do-curso-e-checkout-externo)
- [Arquitetura](#arquitetura)
- [Como o quiz funciona](#como-o-quiz-funciona)
- [Guia de conteúdo: perguntas, respostas, categorias, módulos e aulas](#guia-de-conteúdo)
- [Pagamentos (simulados) e como usar um provedor real](#pagamentos)
- [Recuperação de resultado](#recuperação-de-resultado)
- [Analytics e LGPD](#analytics-e-lgpd)
- [Testes](#testes)
- [Segurança](#segurança)
- [Próximos passos](#próximos-passos)
- [Estrutura de pastas](#estrutura-de-pastas)

---

## Destaques

| Área | O que tem |
| --- | --- |
| **Quiz** | Uma pergunta por vez, progresso visível por etapa, voltar/avançar, atalhos (A, B, C… / 0–5 / Enter), retomada automática de onde parou, escolha única, múltipla e escala. |
| **Adaptativo** | Etapas que só aparecem para o momento e os desafios escolhidos (conquista, conversas, romance, confiança, crise, término, relação duradoura) e perguntas condicionais. 12 a 21 passos, conforme o caminho. |
| **Objeções** | Perguntas montadas a partir do roteiro de objeções de venda (vergonha, desconfiança, "será que funciona?", tempo, dinheiro, garantia). As respostas aparecem no resultado como **"Suas dúvidas, respondidas"**. |
| **Pergunta de valor** | Ao final de cada etapa, o módulo relacionado aparece com preço e a pessoa responde se **concorda com o valor** (sem cobrança). A resposta pré-seleciona o carrinho e alimenta as estatísticas de preço. |
| **QuizEngine** | Motor puro em TypeScript: pontuação normalizada (0–100), regras condicionais, categoria principal, secundárias e módulos recomendados. |
| **Resultado** | **Módulo ideal em destaque**, outros indicados, oferta do curso completo, explicações cuidadosas (não diagnósticas), pontuação de todos os temas, envio por e-mail, link de compartilhamento **somente leitura**, "remover deste navegador", **saída rápida** quando há sinal de risco e exclusão dos dados (LGPD). |
| **Curso** | 8 módulos com texto completo, prévia gratuita, **24 aulas em vídeo** (YouTube, Vimeo, Panda Video ou .mp4) com transcrição e uma **aula grátis** por módulo. |
| **Checkout** | Pix (QR Code + copia e cola + validade), boleto (linha digitável) e cartão (tokenizado no navegador, parcelamento), desconto de combo opcional, webhooks assinados — ou **checkout externo** (Kiwify) por módulo e para o curso completo. |
| **Painel admin** | Categorias, etapas, perguntas com **grade de pesos**, construtor visual de **regras/condições**, módulos e **aulas em vídeo**, preços com taxa de aceitação, **oferta do curso**, **respostas às dúvidas**, pedidos, e-mails simulados e auditoria — **sem mexer no código**. |
| **Kiwify** | `npm run curso:exportar` separa módulos, aulas, roteiros, textos (Markdown/HTML/PDF), planilha e textos de venda; `npm run curso:videos` gera vídeos-rascunho com slides e narração em pt-BR. |
| **Qualidade** | 211 testes unitários/integração + 8 E2E (celular e desktop), ESLint, TypeScript estrito, `npm audit` sem vulnerabilidades. |
| **Segurança** | CSP com nonce (players de vídeo liberados por lista fechada), cookies HttpOnly/`__Host-`, proteção CSRF, rate limiting, tokens com hash, scrypt, auditoria, validação com zod em todas as entradas. |
| **Acessibilidade** | Mobile-first, HTML semântico (radios/checkboxes nativos), foco gerenciado, `aria-live`, barras de progresso acessíveis, transcrição das aulas, contraste AA, `prefers-reduced-motion`. |

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

Prepare o banco (gera o cliente Prisma, aplica as migrações e grava o conteúdo do curso + o administrador):

```bash
npm run setup
```

Suba o servidor de desenvolvimento:

```bash
npm run dev
```

- Site: <http://localhost:3000>
- Painel: <http://localhost:3000/admin> (login com `ADMIN_EMAIL` / `ADMIN_PASSWORD` do `.env`)

> **Banco criado antes do Fórmula do Amor?** Aplique a migração nova e troque o conteúdo antigo pelo do curso com
> `npm run db:deploy` e `npm run db:seed -- --force`.

### Scripts

| Comando | O que faz |
| --- | --- |
| `npm run dev` | Servidor de desenvolvimento (Next.js + Turbopack). |
| `npm run build` / `npm start` | Build e servidor de produção. |
| `npm run setup` | `db:generate` + `db:deploy` + `db:seed`. |
| `npm run db:migrate` | Cria/aplica migrações após mudar `packages/db/prisma/schema.prisma`. |
| `npm run db:seed` | Grava o conteúdo do curso (não sobrescreve um banco que já tem conteúdo). `-- --force` restaura o conteúdo padrão: regrava o curso e remove categorias, etapas, perguntas e regras que não fazem parte dele (módulos antigos já vendidos são só desativados). |
| `npm run db:studio` | Abre o Prisma Studio para inspecionar o banco. |
| `npm run db:cleanup` | Retenção de dados (apaga quizzes não concluídos antigos, links expirados etc.). `-- --dry-run` só mostra. |
| `npm run admin:create -- --email pessoa@exemplo.com` | Cria administrador (senha pedida no terminal). `--reset-password` troca a senha e encerra sessões. |
| `npm run curso:exportar` | Exporta o curso atual (do banco, com as edições do admin) para `curso-kiwify/`: módulos, aulas, roteiros, textos em Markdown/HTML/PDF, planilha e textos de venda. `-- --sem-pdf` pula os PDFs. |
| `npm run curso:videos` | (Windows) Gera vídeos-rascunho de todas as aulas em `curso-kiwify/videos-rascunho/`. `-- -Modulo 3` só um módulo; `-- -Refazer` regera. |
| `npm test` | Todos os testes unitários e de integração. |
| `npm run test:e2e` | Testes de ponta a ponta (Playwright) contra o build de produção. |
| `npm run typecheck` / `npm run lint` | Verificação de tipos e ESLint. |

---

## O curso Fórmula do Amor

O livro (83 páginas, 18 capítulos) foi reorganizado em **8 módulos**, na ordem da jornada que o próprio roteiro de
vendas descreve: *primeiro você cuida de si mesma; depois aprende a se conectar de forma natural, com comunicação e
atitudes*. Os textos foram reescritos a partir dos capítulos, com exercícios práticos, resumo e tarefas da semana.

| Módulo | Capítulos do livro | Aulas em vídeo (~1 min) |
| --- | --- | --- |
| 1. **Comece por Você** 💖 | Introdução · Compatível com meu namorado · Meu namorado é bom para mim? · Amar-se primeiro | Tudo começa em você · Seus valores fundamentais · Ele é bom para mim? |
| 2. **A Arte da Conquista** 💘 | Estratégias para conseguir um namorado · Relacionamentos online | Seja você mesma (de verdade) · Elogio na medida e conversa de mão dupla · Do online ao primeiro encontro |
| 3. **Conversas que Aproximam** 💬 | Coisas para falar sem parecer chata · Comunicação (evitar o término) | Assunto que não acaba · Ouvir para entender, não para vencer · Falar de sentimentos sem parecer chata |
| 4. **Romance e Surpresas** 🎁 | Presentes caseiros · Maneiras de surpreender · 10 coisas românticas · Ideias fofas | Presentes que nenhuma loja vende · Surpresas que ele não espera · Pequenos gestos, todo dia |
| 5. **Confiança sem Paranoia** 🤝 | 4 razões para não suspeitar · Traição no relacionamento · Ciúme | Por que fugir dos testes de fidelidade · Fatos, palpites e boatos · Se a traição aconteceu |
| 6. **Quando a Relação Balança** 🩹 | Como salvar seu relacionamento · Evitar um término · Pedir desculpas | Crise não é fim · Faça a sua parte · O pedido de desculpas que funciona |
| 7. **Depois do Término** 🦋 | Términos doem · Como reconquistar a pessoa amada | Sinta a dor, sem se afundar · Vale a pena voltar? · A reaproximação leve |
| 8. **Amor que Dura** 💍 | Relacionamentos comprometidos · Como ser uma namorada melhor | As 4 fases do relacionamento · Parceira, não capacho · Espaço, interesse e diversão |

Cuidados editoriais: afirmações sem fonte do livro (estatísticas, nomes de pesquisadores) e indicações de produtos de
terceiros ficaram de fora; o conselho de "não voltar se houve abuso" foi reforçado com canais de apoio; a culpa por
uma traição é sempre de quem trai; e os roteiros têm narração neutra (podem ser gravados por qualquer pessoa).

**Quiz (10 etapas, 28 perguntas, 17 regras).** Todas passam por *Seu momento* (momento, até 2 desafios e como se sente
ao buscar ajuda), *Você em primeiro lugar* (valor próprio, "fachada", grandes questões e, para quem está ou esteve em
uma relação, a pergunta de segurança) e *Seu jeito de começar* (tempo por dia e o que a faria se sentir segura). No
meio, aparecem só as etapas do momento e dos desafios escolhidos — cada uma termina com a pergunta de valor do seu
módulo. Regras reforçam o amor-próprio quando ele é a raiz (ex.: "quero voltar porque minha vida perdeu o rumo"),
garantem que o módulo do momento da pessoa esteja entre as indicações e transformam as dúvidas em respostas às
objeções no resultado.

**Preços.** 8 × R$ 15 = **R$ 120** (valor cheio), sem desconto de combo por padrão, até 6x (parcela mínima de R$ 10).
Garantia anunciada: 7 dias. Tudo editável em Painel → Preços e Painel → Configurações.

O conteúdo fica em [`packages/db/seed/content/`](packages/db/seed/content/) e é testado
(`packages/db/test/course-content.test.ts`): configuração sem erros, 8 × R$ 15 = R$ 120, 3 aulas de ~1 minuto por
módulo e os caminhos principais levando ao módulo esperado.

---

## Aulas em vídeo

- Cada módulo tem aulas (`ModuleVideo`): título, duração, **roteiro** (exibido como transcrição), **destaques na tela**,
  link do vídeo e se é a **aula grátis** da página pública do módulo.
- **Links aceitos:** YouTube (inclusive "não listado"; vira o player `youtube-nocookie.com`), Vimeo (inclusive com
  hash de vídeo privado), Panda Video ou arquivo `.mp4`/`.webm` (`https://…` ou em `apps/web/public/videos/…`). Qualquer
  outro endereço é recusado no painel e a CSP só libera esses players (`frame-src`).
- **Onde aparecem:** a aula grátis na página do módulo (`/modulos/slug`); todas as aulas + o texto completo na área do
  pedido pago. Sem link cadastrado, a aula aparece como "vídeo em produção", com os destaques e a transcrição.
- **Vídeos-rascunho:** `npm run curso:videos` (Windows) gera um MP4 720p por aula, com slides na identidade do site e
  narração sintética em pt-BR (voz do Windows), mais os slides em PNG — para testar o curso antes da gravação
  definitiva com voz humana. Ficam em `curso-kiwify/videos-rascunho/` (fora do Git).

---

## Kiwify: material do curso e checkout externo

- [`curso-kiwify/COMO-SUBIR-NA-KIWIFY.md`](curso-kiwify/COMO-SUBIR-NA-KIWIFY.md): passo a passo (produto, 9 ofertas —
  curso completo e um módulo por R$ 15 cada —, área de membros, grupos que liberam só o módulo comprado, links).
- `npm run curso:exportar` gera o restante da pasta a partir do banco: `modulos/NN-slug/` (descrição do módulo, um
  arquivo por aula com roteiro e texto na tela, texto completo em Markdown/HTML/PDF), `estrutura.csv`, `aulas.json` e
  `oferta-e-pagina-de-vendas.md`.
- **Ligar o site à Kiwify:** em Painel → Módulos e aulas, cole o link de checkout de cada módulo; em Painel →
  Configurações → Oferta do curso, o do curso completo. Os botões de compra passam a levar para lá (só links
  `https://`). O checkout do site continua valendo para módulos sem link.

---

## Arquitetura

Monorepo com **npm workspaces**. Cada preocupação vive em um pacote separado, com dependências apontando
sempre "para dentro" (o motor não conhece banco, framework nem pagamento):

```
apps/web  (Next.js 16 — frontend, API, painel admin)
  ├── src/app ............ páginas e rotas de API (camada HTTP fina)
  ├── src/components ..... interface (quiz, resultado, curso, checkout, admin)
  ├── src/server ......... serviços de aplicação, oferta, segurança, e-mail, integração dos pacotes
  └── scripts ............ exportação do curso (Kiwify) e vídeos-rascunho
        │
        ├──► packages/quiz-engine   regras de pontuação e recomendação (TypeScript puro)
        ├──► packages/payments      contrato PaymentGateway, precificação, gateway simulado
        ├──► packages/analytics     catálogo de eventos (sem dados pessoais) e adaptadores
        └──► packages/db            Prisma (schema, migrações, cliente), carga da definição, conteúdo do curso
```

| Pacote | Responsabilidade | Depende de |
| --- | --- | --- |
| `@relacionamentos/quiz-engine` | `QuizEngine`: fluxo adaptativo, pontuação, regras, recomendação, validação da configuração. | zod |
| `@relacionamentos/payments` | Interface `PaymentGateway`, cálculo de preço/parcelas, webhooks HMAC, gateway **mock** (Pix/boleto/cartão), tokenizador de cartão para o navegador. | qrcode |
| `@relacionamentos/analytics` | Eventos tipados e validados, rastreadores (consentimento, composição, tolerância a falhas), funil. | zod |
| `@relacionamentos/db` | Esquema Prisma (SQLite em dev), cliente, `loadQuizDefinition`, hash de senha, conteúdo do curso (seed) e scripts. | quiz-engine, Prisma |
| `@relacionamentos/web` | Next.js: páginas, API, painel, segurança, e-mail, exportação do curso. | todos acima |

Mais detalhes (modelo de dados, fluxos e decisões) em [`docs/ARQUITETURA.md`](docs/ARQUITETURA.md).

---

## Como o quiz funciona

1. **Etapas e perguntas.** O quiz é dividido em etapas (ex.: "Você em primeiro lugar"). Cada etapa tem perguntas de
   escolha única, múltipla escolha ou escala 0–5, exibidas **uma por vez**.
2. **Pesos.** Cada opção soma pontos (−10 a 10) em uma ou mais **categorias** (temas — no curso, uma por módulo).
3. **Normalização.** A pontuação de cada tema vai de 0 a 100: *pontos obtidos ÷ máximo possível* considerando só as
   perguntas respondidas. Assim, temas com mais perguntas não dominam o resultado.
4. **Adaptatividade.** Etapas e perguntas podem ter **condições** — por resposta anterior ("se está em uma relação")
   ou pela pontuação parcial de um tema ("se Conversa ≥ 50"). As condições só olham para passos anteriores, então não
   há dependências circulares; respostas de perguntas que deixaram de aparecer são descartadas.
5. **Pergunta de valor.** Ao fim de cada etapa ligada a um módulo, a pessoa vê o módulo (aulas, destaques e preço) e
   responde: *concordo com o valor* / *quero ver a prévia* / *não concordo*. É possível exigir uma relevância mínima
   do tema para exibir a pergunta.
6. **Regras condicionais.** Após a pontuação, regras podem **somar** ou **multiplicar** pontos, **recomendar** um
   módulo ou adicionar **sinalizadores** (ex.: `safety_support`, que mostra canais de apoio antes das ofertas, e os
   `objecao_*`, que mostram as respostas às dúvidas da pessoa).
7. **Recomendação (QuizEngine).** Retorna a **categoria principal** (se atingir o mínimo configurado), as
   **secundárias**, todas as **pontuações** e os **módulos recomendados** (tema principal → secundários → regras →
   módulos cujo valor a pessoa aceitou → tema mais próximo), com sugestão de pré-seleção no checkout. O primeiro é o
   **módulo ideal** exibido em destaque.
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
quizzes (o cache da definição é invalidado a cada alteração). A página inicial do painel mostra a **Verificação da
configuração**, que acusa erros como condições apontando para perguntas inexistentes.

### Adicionar ou editar uma categoria (tema)

**Painel → Categorias → "+ Nova categoria"**

- **Nome** e **identificador (slug)**, ex.: `rotina`.
- **Descrição curta** (aparece na lista de pontuações) e **explicação cuidadosa** (aparece quando o tema se destaca).
  Escreva sem rótulos nem tom de diagnóstico: fale de possibilidades, acolhimento e próximos passos.
- **Cor** (barras do resultado) e **ordem** (critério de desempate).
- Depois, dê pesos a ela nas perguntas e ligue-a a um módulo — senão a verificação avisa que o tema nunca pontua.

### Adicionar uma etapa

**Painel → Etapas → "+ Nova etapa"**

- **Título**, **descrição** e **ordem**.
- **Módulo relacionado**: habilita a pergunta de concordância com o valor ao final da etapa.
- **Relevância mínima (0–100)**: `0` pergunta sempre; `40` só pergunta se algum tema do módulo pontuar ≥ 40.
- **Condição de exibição** (opcional): mostra a etapa inteira só em certos casos (ex.: só para quem marcou o desafio
  "Ciúme ou desconfiança").

### Adicionar uma pergunta e suas respostas (opções e pesos)

**Painel → Perguntas e pesos → "+ Nova pergunta"**

1. Escolha a **etapa**, o **tipo** (escolha única, múltipla escolha ou escala 0–5) e a **ordem**.
2. Escreva o **enunciado** e, se quiser, um texto de apoio. Na múltipla escolha, defina o máximo de opções marcadas.
   Na escala, preencha os rótulos do 0 e do 5 e use **"Gerar escala 0–5"**.
3. Na **grade de pesos**, cada linha é uma opção e cada coluna uma categoria. Exemplo:

   | Opção | Romance e encanto | Amor-próprio |
   | --- | --- | --- |
   | Tenho ideias e coloco em prática | 0 | 0 |
   | Quero, mas me faltam ideias | 3 | 0 |
   | Tenho medo de parecer exagerada ou brega | 2 | 1 |

   Deixe 0 onde a opção não diz nada sobre o tema. Pesos negativos são permitidos (−10 a 10). Dica: só dê peso a temas
   cuja etapa aparece no mesmo caminho (ou ao Amor-próprio, que todos respondem) — senão uma única resposta pode
   deixar um tema com pontuação alta demais.
4. **Condição de exibição** (opcional), com o construtor visual:
   - *resposta*: "`Onde você costuma conhecer pessoas?` foi respondida com `Em aplicativos e redes sociais`";
   - *pontuação*: "Pontuação de `Conversa e conexão` ≥ `50`";
   - combine cláusulas com **TODAS** / **QUALQUER uma** e use **NÃO** para negar. Para grupos aninhados, use
     **"Editar como JSON"** (validado no servidor).

> Editar uma opção existente mantém o seu identificador, então regras e respostas que apontam para ela continuam
> funcionando. Excluir uma pergunta quebra regras que dependem dela — prefira **desativar**.

### Criar uma regra condicional

**Painel → Regras → "+ Nova regra"**: defina **quando** (mesmo construtor de condições; cláusulas de pontuação usam
a pontuação base, antes de qualquer regra) e **efeitos**:

| Efeito | Exemplo |
| --- | --- |
| Somar pontos | "Quero voltar porque minha vida perdeu o rumo" → +15 em *Amor-próprio* (regra do curso) |
| Multiplicar | (exemplo) "Romance quase não existe mais" → *Romance* × 1,15 |
| Recomendar módulo | "Não conseguimos falar sem brigar" → recomendar *Conversas que Aproximam* |
| Sinalizador | "Já sentiu medo dele" → `safety_support` (canais de apoio em destaque); "Um valor que caiba no bolso" → `objecao_preco` |

Regras de **prioridade** maior aplicam seus efeitos primeiro (importa ao combinar soma e multiplicação).

### Adicionar um módulo e suas aulas

**Painel → Módulos e aulas → "+ Novo módulo"**

- **Título, subtítulo, slug** (endereço público `/modulos/slug`), **emoji da capa**, **preço** e, opcionalmente, o
  **link de checkout externo** (ex.: Kiwify).
- **Categorias relacionadas**: definem quando o módulo é recomendado.
- **Aulas em vídeo**: título, duração, link do vídeo, roteiro/transcrição, destaques na tela, aula grátis e ativa;
  reordene com ↑ ↓.
- **Prévia gratuita** e **texto completo** (liberado após o pagamento) em markdown simples: `## título`,
  `### subtítulo`, `- lista`, `1. lista numerada`, `> citação`, `**negrito**`, `*itálico*`. HTML não é permitido
  (proteção contra XSS); use **Pré-visualizar** para conferir.
- Módulos já vendidos não podem ser excluídos — desative-os.

### Preços, oferta e respostas às dúvidas

- **Painel → Preços**: preço de cada módulo ao lado da **taxa de concordância** registrada nas perguntas de valor e do
  número de vendas; desconto de combo (a partir de N módulos, 0 desativa), parcelas e parcela mínima. O checkout
  **sempre** recalcula o total no servidor com esses valores.
- **Painel → Configurações → Oferta do curso**: garantia anunciada (dias) e checkout externo do curso completo.
- **Painel → Configurações → Respostas às dúvidas (objeções)**: título e resposta de cada sinalizador `objecao_*`.
  Os marcadores `{preco_modulo}`, `{preco_curso}`, `{parcelas}`, `{modulos}` e `{garantia_dias}` são trocados pelos
  valores atuais. Todas aparecem nas "Dúvidas frequentes" da página inicial.

### Editar o conteúdo pelo código (opcional)

O conteúdo inicial está em [`packages/db/seed/content/`](packages/db/seed/content/): um arquivo por módulo em
`modules/` (texto, prévia e aulas), o quiz em `quiz.ts` e as configurações e objeções em `settings.ts`, com ids
legíveis (`cat_conquista`, `q_momento`, `opt_momento_crush`…). Depois de editar:

```bash
npm run db:seed -- --force
```

O seed usa `upsert` (não duplica) e **restaura** o conteúdo padrão (os links de vídeo cadastrados no painel são
mantidos).

---

## Pagamentos

Nesta versão os pagamentos do site são **simulados** (`PAYMENT_PROVIDER=mock`), mas seguem o mesmo fluxo de um provedor
real. Para vender pela Kiwify, cadastre os links de checkout externo (veja [Kiwify](#kiwify-material-do-curso-e-checkout-externo)).

| Método | Simulação |
| --- | --- |
| **Pix** | QR Code + "copia e cola" no formato EMV, com um identificador de arranjo **fictício** (nenhum banco consegue pagar), e validade configurável. |
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

- **Mesmo navegador:** a sessão fica em um cookie `HttpOnly`; o quiz retoma de onde parou e **"Meu resultado"** abre o
  último resultado.
- **Link pessoal:** cada resultado tem um link secreto (`/resultado/<token de 256 bits>`); no banco fica só o hash.
  Ele permite gerenciar o resultado (e-mail, exclusão), por isso não deve ser compartilhado.
- **Compartilhar:** "Compartilhar (somente leitura)" gera outro link, que só permite **ver** o resultado.
- **Aparelho compartilhado:** "Remover deste navegador" apaga o acesso local; quando as respostas indicam medo,
  humilhação ou agressão, o botão **"Sair rápido"** remove o acesso e troca a página por um site neutro.
- **E-mail (opcional, com consentimento):** a pessoa pode receber o link e, depois, pedir em `/recuperar` um
  **link mágico** (válido por 30 min, uso único, confirmado por botão para que leitores de e-mail não o consumam).
  A resposta é sempre a mesma, exista ou não o e-mail (sem enumeração).
- Em desenvolvimento, os e-mails ficam em **Painel → E-mails (simulação)**.

---

## Analytics e LGPD

- **Métricas de uso só com consentimento** (banner). Eventos têm catálogo fixo e esquemas estritos — nunca incluem
  nome, e-mail, CPF ou o conteúdo das respostas; a sessão é identificada por pseudônimo.
- Indicadores de negócio do painel (quizzes, pedidos, receita, aceitação de preço) vêm de dados operacionais agregados.
- A pessoa pode **excluir** respostas e resultado na página do resultado; `npm run db:cleanup` aplica a retenção.
- Adaptadores: banco próprio (padrão) e console; para GA4/PostHog/Segment, crie um `AnalyticsTracker` e adicione-o
  em `apps/web/src/server/analytics.ts`.
- A política em `/privacidade` é um **texto de demonstração**: revise com assessoria jurídica antes de publicar.

---

## Testes

```bash
npm test            # 211 testes: motor, pagamentos, analytics, conteúdo do curso e integração do app
npm run test:e2e    # 8 cenários E2E (celular e desktop) contra o build de produção
```

| Suíte | Cobre |
| --- | --- |
| `packages/quiz-engine/test` (65) | Pontuação e normalização, **regras condicionais** (soma, multiplicação, prioridade, sinalizadores), **fluxo** (ordem, adaptatividade, voltar, validação, progresso), recomendação e validação da configuração. |
| `packages/payments/test` (35) | Preço/desconto/parcelas, cartão (Luhn, bandeira, validade, tokenização), CPF, Pix (EMV/CRC16), boleto (FEBRABAN), assinatura de webhook. |
| `packages/analytics/test` (8) | Catálogo estrito, consentimento, tolerância a falhas, funil. |
| `packages/db/test` (16) | Conteúdo do curso: configuração válida, 8 × R$ 15 = R$ 120, 3 aulas de ~1 min por módulo, etapas adaptativas, módulo ideal para cada perfil, sinal de cuidado e objeções. |
| `apps/web/test` (87) | **Fluxo do quiz** via serviços reais e banco de teste, **recuperação de resultado**, checkout (preços, combo, parcelas, aulas liberadas só após pagamento), webhooks, admin (login, bloqueio, CSRF, CRUD, **aulas em vídeo**, **checkout externo**, **oferta e objeções**), links de vídeo aceitos/recusados, CSP e as regressões da revisão de segurança. |
| `apps/web/e2e` (8) | Jornada completa (landing → quiz → módulo ideal → Pix → aulas e texto), cartão recusado, painel (preço e vídeo de aula sem código) e cabeçalhos de segurança. |

Os testes de integração usam `data/test.db` e os E2E `data/e2e.db` — o banco de desenvolvimento nunca é tocado.
Para o E2E, instale o Chromium (`npx playwright install chromium`) ou use um navegador já instalado:
`PLAYWRIGHT_CHANNEL=msedge npm run test:e2e` (ou `chrome`).

---

## Segurança

Resumo dos controles (detalhes, modelo de ameaças e recomendações para produção em
[`docs/SEGURANCA.md`](docs/SEGURANCA.md)):

- **CSP com nonce por requisição** (`src/proxy.ts`), `X-Frame-Options: DENY`, HSTS, `nosniff`, `Permissions-Policy`;
  páginas privadas com `no-store`, `no-referrer` e `noindex`. Vídeos: `frame-src` só para YouTube (sem cookies),
  Vimeo e Panda Video, e o painel só aceita links desses players ou de arquivos `.mp4`.
- **Cookies** `HttpOnly`, `SameSite` e prefixo `__Host-` em produção; **CSRF**: verificação de `Origin`/`Sec-Fetch-Site`
  + `Content-Type: application/json` em toda escrita.
- **Tokens** de 256 bits; no banco só o **hash SHA-256**. Senhas com **scrypt** (parâmetros OWASP), bloqueio após 5
  falhas, limites por IP e por e-mail, respostas genéricas, sessões com expiração e inatividade, **auditoria**.
- **Preço sempre calculado no servidor**; webhooks com **HMAC + janela de tempo + idempotência**; cartão tokenizado;
  links de checkout externo só `https://` (sem `javascript:` nem credenciais embutidas).
- Entradas validadas com **zod** (esquemas estritos, limites de tamanho lidos em streaming); markdown sem HTML (sem
  XSS); Prisma parametrizado (sem SQL injection).
- **Rate limiting** que não confia em `X-Forwarded-For` forjável (`TRUST_PROXY_HOPS`) e nunca vira um limite global
  apertado; links de compartilhamento **somente leitura**; produção **não inicia** com provedores de demonstração
  (`ALLOW_DEMO_PROVIDERS`); `npm audit` sem vulnerabilidades.

A **revisão de segurança** completa (problemas encontrados e corrigidos, pontos verificados e riscos aceitos) está
em [`docs/SEGURANCA.md`](docs/SEGURANCA.md#revisão-de-segurança-setembro2026).

---

## Próximos passos

1. **Gravar as 24 aulas** com voz humana, seguindo os roteiros de `curso-kiwify/modulos/` (os vídeos-rascunho servem
   de guia de tempo e de slides). Suba na Kiwify e, para a aula grátis de cada módulo, cadastre o link no painel.
2. **Revisão profissional:** revise perguntas, pesos e textos com um(a) psicólogo(a)/terapeuta — o motor é
   configurável justamente para isso. Ajuste preços usando a taxa de concordância da página **Preços**.
3. **Vender pela Kiwify:** siga [`COMO-SUBIR-NA-KIWIFY.md`](curso-kiwify/COMO-SUBIR-NA-KIWIFY.md) e cadastre os links de
   checkout no painel. Para manter o checkout próprio, siga [Trocando por um provedor real](#trocando-por-um-provedor-real-mercado-pago-pagarme-asaas-stripe-efí).
4. **E-mail real:** implemente `EmailProvider` em `apps/web/src/server/email.ts` (Amazon SES, Resend, Postmark…) e
   configure SPF/DKIM/DMARC no domínio.
5. **Banco em produção:** troque o `provider` do `schema.prisma` para `postgresql`, instale `@prisma/adapter-pg`,
   ajuste `packages/db/src/client.ts` e gere novas migrações. Os campos JSON são texto e os "enums" são strings — a
   migração é direta.
6. **Infra:** execute em HTTPS atrás de proxy confiável (`TRUST_PROXY_HOPS`), use Redis para o rate limiting com várias
   instâncias, agende `npm run db:cleanup`, configure backups e monitoramento de erros.
7. **Jurídico:** termos de compra, política de privacidade (controlador, encarregado/DPO, bases legais), direito de
   arrependimento (CDC, art. 49), nota fiscal e confirmação dos direitos de uso do texto do livro.

---

## Estrutura de pastas

```
.
├── apps/web/                      # Next.js (frontend, API, painel)
│   ├── src/app/                   # páginas e rotas (api/, admin/, quiz/, resultado/, modulos/, checkout/, pedido/…)
│   ├── src/components/            # quiz/, result/, course/, checkout/, admin/, site/, ui/
│   ├── src/server/                # services/, auth/, security/, offer, email, analytics, payments, env
│   ├── src/proxy.ts               # CSP com nonce + barreira do /admin
│   ├── scripts/                   # exportar-curso.ts (Kiwify) e gerar-videos-rascunho.ps1
│   ├── test/                      # testes de integração (Vitest + banco de teste)
│   └── e2e/                       # testes de ponta a ponta (Playwright)
├── packages/
│   ├── quiz-engine/               # QuizEngine (pontuação, regras, recomendação)
│   ├── payments/                  # PaymentGateway, precificação, gateway simulado
│   ├── analytics/                 # eventos e rastreadores
│   └── db/                        # Prisma (schema, migrações), conteúdo do curso (seed/content), scripts
├── curso-kiwify/                  # material do curso para a Kiwify (guia + exportação)
├── docs/                          # ARQUITETURA.md, SEGURANCA.md
├── data/                          # bancos SQLite locais (ignorados pelo Git)
└── .env.example                   # variáveis de ambiente documentadas
```
