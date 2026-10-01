# Como subir o Fórmula do Amor na Kiwify

Passo a passo para publicar os 8 módulos (24 aulas em vídeo + 8 textos) na Kiwify e vender:

- o **curso completo por R$ 120** (valor cheio, parcelável), e
- **cada módulo avulso por R$ 15**, para quem quer começar só pelo módulo indicado no quiz.

Tudo isso cabe em **um único produto** na Kiwify, usando **ofertas** (um link de checkout para cada preço) e **grupos** da área de membros (cada grupo libera só os módulos comprados). Os nomes de menus abaixo seguem a [central de ajuda da Kiwify](https://ajuda.kiwify.com.br/pt-br/category/area-de-membros-xg7v8s/). Se algum botão estiver com outro nome no seu painel, procure pelo equivalente.

> **Segurança:** faça login na Kiwify você mesma(o). Nunca compartilhe sua senha nem códigos de verificação com ninguém, nem com assistentes de IA.

---

## 0. Antes de começar (o que já está pronto nesta pasta)

| O quê | Onde |
|---|---|
| Nome, descrição, preços, garantia e perguntas frequentes | [`oferta-e-pagina-de-vendas.md`](oferta-e-pagina-de-vendas.md) |
| Lista de módulos e aulas, na ordem | [`estrutura.csv`](estrutura.csv) (abre no Excel/Google Planilhas) |
| Descrição de cada módulo | `modulos/NN-.../00-sobre-o-modulo.md` |
| Roteiro de cada vídeo (narração + texto na tela) | `modulos/NN-.../aula-01…03-*.md` |
| Texto completo do módulo | `modulos/NN-.../aula-04-texto-do-modulo.md` e `texto-do-modulo.html` |
| PDF de apoio para anexar na aula | `modulos/NN-.../formula-do-amor-modulo-NN.pdf` |
| Vídeos-rascunho (narração sintética) e slides em PNG | `videos-rascunho/` (gere com `npm run curso:videos`) |

**Falta só gravar os 24 vídeos.** Cada roteiro tem ~150 palavras (cerca de 1 minuto). Dicas:

1. Grave na horizontal (16:9), com luz de frente e o celular apoiado na altura dos olhos.
2. Leia o roteiro em voz alta algumas vezes antes; não precisa decorar, pode usar um app de teleprompter.
3. No editor (CapCut, InShot, Canva…), adicione o "texto na tela" de cada roteiro e legendas automáticas.
4. Exporte em **MP4 1080p** com o nome sugerido em cada roteiro (ex.: `01-comece-por-voce-aula-01-tudo-comeca-em-voce.mp4`).

A Kiwify aceita vídeos de até **5 GB** e até **4K** por aula, um vídeo por aula, sem custo; depois do envio, o vídeo leva **15 a 30 minutos** para ficar pronto ([fonte](https://ajuda.kiwify.com.br/pt-br/article/como-funciona-o-upload-de-videos-1ezn8zs/)).

---

## 1. Criar o produto

1. No menu lateral, clique em **Produtos** → **Criar produto** ([fonte](https://ajuda.kiwify.com.br/pt-br/article/como-cadastrar-o-seu-produto-1lxh5g7/)).
2. Escolha **pagamento único** e entrega pela **Área de membros da Kiwify**.
3. Preencha com os textos de [`oferta-e-pagina-de-vendas.md`](oferta-e-pagina-de-vendas.md):
   - **Nome:** Fórmula do Amor
   - **Descrição:** a "descrição curta"
   - **Preço:** R$ 120,00 (este será o preço do curso completo)
   - **Site:** o endereço do seu site com o quiz (a página inicial)
4. Salve.

## 2. Criar as ofertas (um preço para cada link)

Em **Produtos** → *Fórmula do Amor* → **Geral** → seção **Preços**, crie as ofertas ([fonte](https://ajuda.kiwify.com.br/pt-br/article/o-que-e-e-como-criar-uma-oferta-1v4f33b/)):

| Nome da oferta | Preço |
|---|---|
| Curso completo | R$ 120,00 |
| Módulo 1 — Comece por Você | R$ 15,00 |
| Módulo 2 — A Arte da Conquista | R$ 15,00 |
| Módulo 3 — Conversas que Aproximam | R$ 15,00 |
| Módulo 4 — Romance e Surpresas | R$ 15,00 |
| Módulo 5 — Confiança sem Paranoia | R$ 15,00 |
| Módulo 6 — Quando a Relação Balança | R$ 15,00 |
| Módulo 7 — Depois do Término | R$ 15,00 |
| Módulo 8 — Amor que Dura | R$ 15,00 |

O preço mínimo aceito pela Kiwify é R$ 5,00. Cada oferta ganha um link de checkout próprio.

## 3. Montar o curso na área de membros

1. Menu **Área de membros** → abra a área do produto. Se for a primeira vez, crie a área ([fonte](https://ajuda.kiwify.com.br/pt-br/article/como-criar-uma-area-de-membros-1l4ndbp/)). Use a versão **Completa** (permite vários cursos e mais personalização).
2. Para cada módulo, clique em **Adicionar** e crie o módulo com o título e a descrição de `00-sobre-o-modulo.md`. A capa recomendada é **320 × 480 px** ([fonte](https://ajuda.kiwify.com.br/pt-br/article/como-adicionar-modulos-e-conteudos-60gk9g/)).
3. Dentro do módulo, clique no **+** → **Adicionar conteúdo** e crie 4 conteúdos, nesta ordem:
   - **Aulas 1, 2 e 3 (vídeo):** título da aula, envie o vídeo e cole a "descrição da aula" do roteiro.
   - **Aula 4 — Texto do módulo:** cole o texto (abra `texto-do-modulo.html` no navegador, selecione tudo e copie; a formatação vem junto) e, se quiser, anexe o PDF em **Anexos** (até 10 arquivos de até 100 MB cada — [fonte](https://ajuda.kiwify.com.br/pt-br/article/como-anexar-arquivos-1ivx4yd/)).
4. Arraste para ajustar a ordem, se precisar. Deixe a liberação como **imediata** ([fonte](https://ajuda.kiwify.com.br/pt-br/article/como-programar-a-liberacao-e-limitacao-do-conteudo-dnja5g/)).

## 4. Liberar só o que foi comprado (grupos)

Grupos são "pacotes de permissão": cada um libera cursos ou **módulos específicos** ([fonte](https://ajuda.kiwify.com.br/pt-br/article/o-que-sao-e-como-gerenciar-os-grupos-1kkf0al/)).

1. Na área de membros, aba **Grupos** → **Adicionar grupo**.
2. Crie 9 grupos:
   - **Curso completo:** todos os 8 módulos.
   - **Módulo 1** … **Módulo 8:** cada um com apenas o módulo correspondente.
3. Vincule cada oferta ao seu grupo: **Produtos** → *Fórmula do Amor* → aba **Área de Membros** → **Controle de Acesso**. Quem comprar a oferta entra automaticamente no grupo ([fonte](https://ajuda.kiwify.com.br/pt-br/article/como-vender-combos-de-cursos-hwc1gi/)).

Quem comprar mais de um módulo avulso entra em mais de um grupo, e o acesso soma.

## 5. Garantia, parcelamento e checkout

- **Garantia:** a Kiwify garante o reembolso em até 7 dias após a compra; um prazo maior precisa ser combinado direto com a aluna ([fonte](https://ajuda.kiwify.com.br/pt-br/article/reembolsos-nk5bdq/)). O site anuncia **7 dias** (Admin → Configurações → Oferta do curso).
- **Parcelamento:** o limite de parcelas fica na aba **Configurações** do produto. Na Kiwify, quem parcela paga um acréscimo e você recebe como se fosse à vista; a parcela mínima é R$ 5,00 ([fonte](https://ajuda.kiwify.com.br/pt-br/article/como-funciona-o-parcelamento-no-checkout-1um5p52/)). Use no site o mesmo número máximo de parcelas (Admin → Preços → "Parcelas"). Com o checkout da Kiwify ligado, o site mostra só "em até Nx no cartão", sem o valor da parcela, porque o acréscimo é calculado pela Kiwify.
- **Visual do checkout:** a aba **Checkout** do produto permite personalizar o checkout ([fonte](https://ajuda.kiwify.com.br/pt-br/article/como-funciona-o-checkout-builder-uileik/)).

## 6. Ligar o site à Kiwify

Na aba **Links** do produto, copie o link de checkout de cada oferta ([fonte](https://ajuda.kiwify.com.br/pt-br/article/o-que-e-e-como-criar-uma-oferta-1v4f33b/)) e cole no painel do site:

1. **Admin → Módulos e aulas → Editar** (em cada módulo) → campo **Link de checkout externo** → link da oferta "Módulo N".
2. **Admin → Configurações → Oferta do curso** → **Checkout externo do curso completo** → link da oferta "Curso completo".

A partir daí, os botões "Quero este módulo" e "Quero o curso completo" (no resultado do quiz, na página inicial e nas páginas dos módulos) levam direto para o checkout da Kiwify. O pagamento (Pix, boleto e cartão) e a entrega das aulas passam a ser feitos pela Kiwify. O checkout simulado do site continua disponível só para os módulos sem link cadastrado.

## 7. Vídeos no próprio site (opcional, recomendado)

A página de cada módulo no site mostra a **aula 1 como amostra grátis**. Para ela tocar no site:

1. Suba a aula 1 de cada módulo no YouTube como **"Não listado"** (ou no Vimeo/Panda Video).
2. Em **Admin → Módulos e aulas → Editar**, cole o link no campo **Link do vídeo** da aula 1.

Os links aceitos são do YouTube, Vimeo, Panda Video ou um arquivo `.mp4`. Enquanto não houver link, o site mostra o cartão "Vídeo em produção" com os destaques da aula e a transcrição.

## 8. Testar antes de divulgar

- Faça uma compra de teste de um módulo avulso e confira se **só aquele módulo** aparece na área de membros.
- Faça o quiz no site até o fim e clique em "Quero este módulo": o link deve abrir o checkout da oferta certa.
- Depois, reembolse as compras de teste pelo painel da Kiwify.

---

### Se você mudar o conteúdo depois

Edite pelo painel do site (Admin → Módulos e aulas) e rode `npm run curso:exportar` para gerar de novo esta pasta com os textos atualizados. Este guia não é apagado pela exportação.
