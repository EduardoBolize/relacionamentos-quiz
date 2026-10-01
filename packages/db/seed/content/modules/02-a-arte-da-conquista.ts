import type { ContentModule } from '../types';

/**
 * Módulo 2 — baseado nos capítulos "Estratégias para conseguir um namorado" e
 * "Os relacionamentos online são saudáveis?".
 */
export const aArteDaConquista: ContentModule = {
  id: 'mod_conquista',
  slug: 'a-arte-da-conquista',
  title: 'A Arte da Conquista',
  subtitle: 'Módulo 2 · Do primeiro olhar ao primeiro encontro',
  description:
    'Como despertar o interesse de quem você quer sendo você mesma: elogios na medida certa, conversa de mão dupla e paquera online com segurança.',
  priceCents: 1500,
  coverEmoji: '💘',
  categoryIds: ['cat_conquista'],
  previewContent: `## O que você vai aprender
- Por que ser você mesma é a estratégia mais eficaz (e como fugir da "fachada")
- Elogios sinceros: a medida que encanta sem sufocar
- A conversa de mão dupla que faz ele querer te ver de novo
- Paquera online: ritmo, sinais de alerta e um primeiro encontro seguro

## Trecho do módulo
> Ele nunca vai conhecer a verdadeira você se você não estiver agindo como a verdadeira você.

Quando a gente se interessa por alguém, a tentação é montar uma versão "perfeita" para agradar. O problema é que ele vai se apaixonar por uma personagem, e manter uma personagem cansa. Neste módulo, você aprende a mostrar o seu melhor sem deixar de ser quem é.`,
  content: `## Antes de tudo: o que você está procurando?
A primeira coisa a considerar é **para que** você quer um namorado. A forma de encontrar alguém depende do que você procura. Você age de um jeito quando busca o homem certo para construir uma vida e de outro quando quer apenas alguém para sair agora.

Este módulo parte do princípio de que você procura alguém que pode se tornar especial. As dicas também funcionam para algo mais casual, mas, se você quer que a relação vá longe, não use nada menos do que elas. E uma regra vale para qualquer caso: **nunca baixe os seus padrões**.

## Estratégia 1: seja você mesma (de verdade)
Quando conhecemos alguém, é natural querer mostrar o nosso melhor, e isso é ótimo. Dizer "por favor" e "obrigada", cuidar da aparência e estar presente na conversa: tudo isso é dar o seu melhor. Outra coisa bem diferente é **mudar completamente o jeito como você age**.

Não diga que adora boliche se você não gosta. Não finja que ama filmes de luta. E não diga que odeia museus se, na verdade, você adora. Ele nunca vai conhecer a verdadeira você se você não estiver agindo como a verdadeira você.

Pense assim: se ele não gostar de quem você é, você economizou meses em uma relação que não ia dar certo. Se gostar, você ganhou algo raro, que é ser amada pelo que é.

## Estratégia 2: elogie com sinceridade, sem exagero
Achou o sorriso dele lindo? Diga! Elogios sinceros encantam. Mas existe uma linha entre demonstrar interesse e se agarrar a cada palavra como se ele fosse uma estrela de cinema. Uma coisa é estar atenta, outra é se pendurar.

- Elogie o que é verdadeiro e específico ("adorei como você contou essa história").
- Um ou dois elogios por encontro bastam. Deixe espaço para o mistério.
- Elogio não é moeda de troca. Não elogie esperando algo em troca.

## Estratégia 3: conversa de mão dupla
Não fique só ouvindo, deixando ele falar a noite inteira. Se ele está feliz em passar o encontro todo falando de si mesmo, talvez seja centrado demais para ser um bom par para você. E, se ele não gosta de falar o tempo todo, vai ficar entediado com o seu silêncio.

Aprenda a dar e receber na conversa:
- Faça perguntas abertas ("como você foi parar nessa profissão?").
- Conte as suas histórias também, e não só as respostas curtas.
- Reaja ao que ele diz e conecte com algo seu.
- Repare se ele também pergunta sobre você. Interesse precisa ser recíproco.

## Onde conhecer alguém que combina com você
Uma ótima maneira de conhecer alguém com qualidades parecidas com as suas é frequentar lugares onde você faz o que gosta. Se você participa de uma ação voluntária, pode conhecer alguém lá e já sabe que vocês têm pelo menos uma coisa em comum. Cursos, grupos de esporte, eventos da sua área e amigos em comum também funcionam muito bem.

## Paquera online sem cair em armadilhas
A internet aproxima pessoas que talvez nunca se cruzassem, e muitas histórias de amor começam assim. Algumas dicas para tirar o melhor proveito dela:

1. **Você não precisa pagar para encontrar alguém.** Com tantas redes sociais disponíveis, pagar um site de namoro costuma ser um passo desnecessário.
2. **Controle o ritmo.** Comece por mensagens. Se estiver confortável, passe para uma ligação e depois para uma chamada de vídeo. No online, vocês têm mais controle sobre a velocidade da relação, e isso ajuda a construir algo sólido.
3. **Planeje o encontro.** Um relacionamento só online pode ser uma forma de fugir de um relacionamento real. Se as coisas vão bem, é natural querer se encontrar. Se ele sempre foge disso, acenda o sinal amarelo: pode ser que ele já esteja em uma relação ou que esconda algo.
4. **Lembre que as pessoas podem não ser quem dizem.** Mesmo depois de meses conversando, o encontro pessoal é quase um recomeço. Vá devagar.

### Checklist do primeiro encontro seguro
- Lugar público e movimentado.
- Avise uma amiga sobre onde você vai e com quem.
- Vá e volte por conta própria.
- Combine um horário para mandar notícias.
- Se algo parecer estranho, confie na sua intuição e vá embora.

## O segredo que não é segredo
A verdade é que não existem habilidades mágicas para conseguir um namorado. Se você quer uma relação baseada em atração, interesses em comum e confiança (a combinação que mais faz uma relação durar), basta seguir estas estratégias com constância. O resto acontece no encontro entre duas pessoas reais.

## Resumo do módulo
- Saiba o que você procura e nunca baixe os seus padrões.
- Dê o seu melhor sem criar uma personagem.
- Elogios sinceros, específicos e na medida.
- Conversa boa é de mão dupla.
- Online: controle o ritmo, marque o encontro e priorize a sua segurança.

## Para praticar esta semana
1. Liste três coisas sobre você que você costuma esconder para agradar e pense em como mostrá-las com naturalidade.
2. Escolha um lugar ou atividade de que você gosta e frequente-o com outros olhos.
3. No próximo papo, faça pelo menos duas perguntas abertas e conte uma história sua.`,
  videos: [
    {
      id: 'vid_conquista_1',
      title: 'Seja você mesma (de verdade)',
      durationSeconds: 60,
      isPreview: true,
      script: `Quer saber qual é a estratégia de conquista mais subestimada que existe? Ser você mesma. Parece simples, mas, quando a gente se interessa por alguém, a tentação é criar uma versão perfeita para agradar. Você diz que adora futebol sem gostar. Finge que odeia museus quando, na verdade, ama.

O problema é que ele vai se apaixonar por uma personagem, e manter uma personagem cansa. Dar o seu melhor é ótimo: ser educada, cuidar da aparência, estar presente. Mudar quem você é, não.

Se ele não gostar da verdadeira você, ótimo: você economizou meses de uma relação que não ia dar certo. Se gostar, você ganhou algo raro, que é ser amada pelo que é. Esta semana, observe: em que momentos você se pega fingindo para agradar?`,
      keyPoints: `Ser você mesma é estratégia
Dar o seu melhor não é virar personagem
Quem gosta da verdadeira você fica
Em que momentos você finge para agradar?`,
    },
    {
      id: 'vid_conquista_2',
      title: 'Elogio na medida e conversa de mão dupla',
      durationSeconds: 60,
      script: `Dois detalhes fazem muita diferença num primeiro encontro. O primeiro é o elogio. Achou o sorriso dele lindo? Diga! Elogios sinceros encantam. Mas existe uma linha entre demonstrar interesse e se agarrar a cada palavra como se ele fosse uma estrela de cinema. Elogie o que for verdadeiro, com naturalidade, e siga a conversa.

O segundo detalhe é a própria conversa. Ficar só ouvindo, deixando ele falar a noite inteira, não ajuda. Ou ele é centrado demais em si mesmo, e isso é um alerta para você, ou vai ficar entediado com o seu silêncio.

Conversa boa é de mão dupla: você pergunta, conta as suas histórias, reage e dá espaço. É assim que os dois se conhecem de verdade. E é isso que faz alguém querer um segundo encontro.`,
      keyPoints: `Elogio sincero, sem exagero
Atenta, não pendurada
Conversa de mão dupla
Pergunte, conte e reaja`,
    },
    {
      id: 'vid_conquista_3',
      title: 'Do online ao primeiro encontro',
      durationSeconds: 60,
      script: `Conheceu alguém pela internet? Ótimo, muitas histórias de amor começam assim. Use a tecnologia a seu favor para controlar o ritmo: primeiro mensagens, depois uma ligação, depois uma chamada de vídeo. Sem pressa.

Se a conversa estiver boa, é natural querer se encontrar. Agora, atenção: se ele sempre foge desse encontro, acenda o sinal amarelo. Pode ser que ele já esteja em um relacionamento ou que esconda algo.

Quando o encontro acontecer, lembre que as pessoas podem não ser quem dizem ser. Marque em local público, avise uma amiga, vá e volte por conta própria. E vá devagar: mesmo depois de meses conversando, pessoalmente é quase um recomeço. Segurança também é amor-próprio.`,
      keyPoints: `Primeiro mensagens, depois ligação e vídeo
Fugir do encontro é sinal amarelo
Local público e amiga avisada
Segurança também é amor-próprio`,
    },
  ],
};
