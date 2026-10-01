import type { ContentModule } from '../types';

/**
 * Módulo 3 — baseado nos capítulos "Coisas para falar sem parecer chata", no trecho sobre
 * comunicação de "Melhor maneira de evitar um término" e em "Como ser uma namorada melhor".
 */
export const conversasQueAproximam: ContentModule = {
  id: 'mod_conversas',
  slug: 'conversas-que-aproximam',
  title: 'Conversas que Aproximam',
  subtitle: 'Módulo 3 · Ter assunto, ouvir de verdade e falar de sentimentos',
  description:
    'Chega de silêncios constrangedores e de discussões que não levam a nada: aprenda a conversar sobre o que ele gosta, a ouvir sem disputar e a falar de sentimentos sem parecer chata.',
  priceCents: 1500,
  coverEmoji: '💬',
  categoryIds: ['cat_comunicacao'],
  previewContent: `## O que você vai aprender
- Assuntos que fazem a conversa fluir, sem precisar de roteiro
- A diferença entre falar e se comunicar
- Como ouvir o que ele diz e também o que ele não diz
- Um jeito leve de puxar conversas sobre sentimentos

## Trecho do módulo
> Vocês podem estar falando, mas não se comunicando, cada um ocupado demais em provar que está certo para ouvir o outro.

Comunicação é o elemento número um de qualquer relacionamento, e o mais importante de todos quando a relação passa por uma fase difícil. A boa notícia é que ela não é um dom: é uma habilidade, e habilidade se treina.`,
  content: `## A conversa é o termômetro da relação
Quando a conversa flui, a relação respira. Quando ela trava, seja por falta de assunto, seja porque toda tentativa vira briga, a distância aparece. Este módulo traz ferramentas simples para os dois cenários.

## 1. Assuntos que fluem
Não existe uma lista mágica de assuntos, porque cada pessoa é diferente. O que existe é um princípio: **falem sobre a relação de vocês e sobre o que os dois gostam**. É chato falar, ou ouvir, sobre algo que só um de vocês conhece.

Quando quiser puxar papo, comece pelo mundo dele. Ele torce para algum time? Teve jogo esses dias? Pergunte. Tem uma banda favorita, um estilo de música, um hobby, uma série? Comece por aí. Quando a pessoa fala do que ama, ela se abre, e a conversa ganha vida sozinha.

### Banco de perguntas leves
- "Como foi o jogo do seu time?"
- "Qual música você não aguenta mais ouvir, mas canta mesmo assim?"
- "Se você pudesse aprender qualquer coisa amanhã, o que seria?"
- "Qual lugar você sonha conhecer?"
- "Qual comida te lembra a infância?"
- "O que você faria num sábado perfeito?"

E vale para você também: compartilhe as suas paixões. Conversa boa nasce de interesse genuíno, não de roteiro decorado.

## 2. Falar não é o mesmo que se comunicar
Muitos casais caem num padrão: toda vez que tentam conversar, acabam brigando. Em geral, isso acontece porque os dois estão **falando, mas não se comunicando**. Cada um está tão preocupado em estar certo e em defender o próprio ponto de vista que ninguém ouve o que o outro está tentando explicar.

A saída é parar e realmente ouvir. Leva um tempo para "reaprender" a conversar, mas vale cada minuto.

### Técnica: ouvir para entender
Na próxima conversa difícil, antes de responder, repita com as suas palavras o que você entendeu:
> "Deixa eu ver se entendi: você ficou chateado porque…"

Isso não é concordar. É mostrar que você ouviu. O clima muda na hora, porque ninguém precisa mais gritar para ser ouvido. Depois, peça o mesmo: "Agora posso te contar como eu vi?".

### Regras de ouro para conversas difíceis
- Um assunto por vez.
- Nada de "você sempre" ou "você nunca". Fale do fato concreto.
- Se o tom subir, façam uma pausa combinada ("vamos retomar daqui a meia hora") e retomem mesmo.
- O objetivo é resolver juntos, não vencer.

## 3. Ouça o que ele não diz
Quando a comunicação está meio quebrada, preste atenção não só no que ele diz, mas principalmente no que **não** diz. Talvez ele esteja se sentindo pouco valorizado. Nesse caso, um pouco mais de atenção resolve muita coisa. Talvez ele esteja sufocado. Aí, o melhor presente é um pouco de espaço.

Sinais para observar: ele ficou mais calado do que o normal? Evita um assunto específico? Mudou a rotina? Em vez de concluir sozinha, pergunte com leveza: "Percebi que você anda mais quieto. Quer conversar?".

## 4. Conversas sobre sentimentos, sem pressão
Perguntar como ele se sente sobre você ou sobre a relação pode parecer mais difícil do que qualquer outro assunto. Para muitos homens, esse tipo de conversa é desconfortável, e não é frescura. Por isso:
- **Escolha a hora.** Nunca no meio de uma briga, nem quando ele acabou de chegar cansado.
- **Comece por você.** "Eu me sinto mais próxima quando…" funciona muito melhor do que "você nunca…".
- **Seja breve e leve.** Uma conversa curta e tranquila hoje vale mais do que duas horas de interrogatório.
- **Parta do que é comum.** Se vocês compartilham uma paixão, ela é o melhor caminho para chegar aos sentimentos, porque nenhum dos dois se entedia.

## 5. Interesses em comum: o combustível da conversa
Quando vocês gostam um do outro, se respeitam e se interessam um pelo outro, nunca falta assunto. Ter coisas em comum é a melhor forma de manter a conversa fluindo. Por isso, cultivar interesses compartilhados, como um passeio, uma série ou uma receita nova, é investir na conversa de amanhã.

E, se você está solteira agora, guarde esta lição para a próxima pessoa: com interesses em comum, tudo fica mais fácil, principalmente as conversas.

## Resumo do módulo
- Fale do mundo dele, do seu e do que é dos dois.
- Falar não é se comunicar: ouça para entender, não para vencer.
- Repita o que entendeu antes de responder.
- Preste atenção também no que não é dito.
- Sentimentos: hora certa, comece por você, seja breve.

## Para praticar esta semana
1. Use duas perguntas do banco de perguntas leves.
2. Na próxima divergência, aplique a técnica de ouvir para entender.
3. Puxe uma conversa curta sobre sentimentos começando com "eu me sinto…".`,
  videos: [
    {
      id: 'vid_conversas_1',
      title: 'Assunto que não acaba',
      durationSeconds: 60,
      isPreview: true,
      script: `Já sentiu aquele silêncio constrangedor e ficou procurando o que dizer? Respira: não existe uma lista mágica de assuntos. O segredo é mais simples: falar sobre o que ele gosta e sobre o que vocês dois gostam.

Ele torce para algum time? Pergunte do último jogo. Tem uma banda favorita, um hobby, uma série? Comece por aí. Quando a pessoa fala do que ama, ela se abre, e a conversa ganha vida sozinha.

E vale para você também: compartilhe as suas paixões. Conversa boa nasce de interesse genuíno, não de roteiro decorado.

Uma dica extra: quando vocês têm coisas em comum, o assunto nunca acaba. Por isso, cultivar interesses compartilhados, como um passeio, um filme ou uma receita, é investir na conversa de amanhã.`,
      keyPoints: `Não existe lista mágica de assuntos
Comece pelo que ele ama
Compartilhe as suas paixões
Interesses em comum = assunto que não acaba`,
    },
    {
      id: 'vid_conversas_2',
      title: 'Ouvir para entender, não para vencer',
      durationSeconds: 60,
      script: `Muitos casais caem num padrão: toda vez que tentam conversar, acabam brigando. Sabe por quê? Porque estão falando, mas não estão se comunicando. Cada um está tão ocupado em provar que tem razão que ninguém ouve o que o outro está tentando dizer.

Quero te propor um teste na próxima conversa difícil. Antes de responder, repita com as suas palavras o que você entendeu: "Deixa eu ver se entendi: você ficou chateado porque…". Isso não é concordar. É mostrar que você ouviu.

Parece pouco, mas muda o clima na hora, porque ninguém precisa mais gritar para ser ouvido. Comunicação é o elemento número um de qualquer relacionamento. E, como toda habilidade, ela se treina, um pouco por dia.`,
      keyPoints: `Falar não é se comunicar
Repita o que entendeu antes de responder
Ouvir não é concordar
Comunicação se treina`,
    },
    {
      id: 'vid_conversas_3',
      title: 'Falar de sentimentos sem parecer chata',
      durationSeconds: 60,
      script: `Perguntar como ele se sente sobre você ou sobre a relação pode parecer mais difícil do que falar de qualquer outro assunto. Não é frescura: para muitos homens, esse tipo de conversa é desconfortável. Então, três cuidados.

Primeiro, escolha a hora: nunca no meio de uma briga, nem quando ele acabou de chegar cansado. Segundo, comece por você: "eu me sinto mais próxima quando…" funciona muito melhor do que "você nunca…". Terceiro, seja breve e leve: uma conversa curta e tranquila hoje vale mais do que um interrogatório de duas horas.

E preste atenção também no que ele não diz. Às vezes, ele só precisa de mais atenção. Outras vezes, de um pouco de espaço. Perceber isso também é conversar.`,
      keyPoints: `Escolha a hora certa
Comece por "eu me sinto…"
Breve e leve
Ouça o que ele não diz`,
    },
  ],
};
