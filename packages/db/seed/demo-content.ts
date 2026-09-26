/**
 * CONTEÚDO DE DEMONSTRAÇÃO — livro fictício "Entre Nós".
 *
 * Tudo aqui pode ser editado depois pelo painel admin (/admin), sem mexer em código.
 * Os ids são legíveis de propósito, para facilitar a leitura das regras e condições.
 *
 * Para transformar em um livro real: substitua os textos dos módulos (prévia e conteúdo
 * completo), revise as perguntas/pesos com um(a) profissional e ajuste os preços.
 */

import type { Condition, EngineSettings, RuleEffect } from '@relacionamentos/quiz-engine';

export const BOOK_TITLE = 'Entre Nós';
export const BOOK_SUBTITLE = 'Guia prático para relações mais leves (edição de demonstração)';

// ─────────────────────────────── Categorias ───────────────────────────────

export interface DemoCategory {
  id: string;
  slug: string;
  name: string;
  shortDescription: string;
  explanation: string;
  color: string;
}

export const demoCategories: DemoCategory[] = [
  {
    id: 'cat_comunicacao',
    slug: 'comunicacao',
    name: 'Comunicação',
    shortDescription: 'Como vocês falam — e escutam — sobre o que importa.',
    explanation:
      'Suas respostas sugerem que conversar sobre incômodos, necessidades e expectativas pode estar exigindo mais energia do que você gostaria. Isso é muito comum: quase ninguém aprende, de fato, a conversar sobre temas difíceis. Não significa que a relação vá mal — significa que vale a pena olhar com carinho para a forma como vocês se falam e se escutam.',
    color: '#8b5cf6',
  },
  {
    id: 'cat_confianca',
    slug: 'confianca',
    name: 'Confiança e segurança emocional',
    shortDescription: 'Sentir que dá para contar com a outra pessoa.',
    explanation:
      'Alguns sinais nas suas respostas apontam para inseguranças, ciúme ou dúvidas sobre o quanto você pode contar com a outra pessoa. Esses sentimentos costumam ter raízes diversas — histórias passadas, combinados pouco claros, fases de distância — e merecem ser acolhidos com cuidado, sem culpa.',
    color: '#0ea5e9',
  },
  {
    id: 'cat_conflitos',
    slug: 'conflitos',
    name: 'Conflitos e discussões',
    shortDescription: 'Como os desentendimentos começam, crescem e terminam.',
    explanation:
      'Desentendimentos fazem parte de qualquer relação. Suas respostas indicam que a forma como as discussões acontecem — e principalmente como terminam — pode estar deixando marcas. A boa notícia é que existem maneiras de discordar sem se ferir, e elas podem ser aprendidas.',
    color: '#f97316',
  },
  {
    id: 'cat_intimidade',
    slug: 'intimidade',
    name: 'Intimidade e conexão',
    shortDescription: 'Proximidade, carinho e tempo de qualidade.',
    explanation:
      'Suas respostas sugerem que a sensação de proximidade — carinho, momentos a dois, cumplicidade — pode estar menor do que você gostaria. A rotina, o cansaço e as responsabilidades costumam ocupar esse espaço aos poucos, sem que ninguém perceba. Reconhecer isso já é um primeiro passo.',
    color: '#ec4899',
  },
  {
    id: 'cat_financas',
    slug: 'financas',
    name: 'Dinheiro a dois',
    shortDescription: 'Decisões, combinados e transparência financeira.',
    explanation:
      'O dinheiro apareceu como um ponto de tensão nas suas respostas. Conversas sobre gastos, dívidas e planos tocam em valores, medos e histórias de família — por isso costumam ser delicadas. Ter combinados claros ajuda a transformar o assunto em projeto comum, e não em disputa.',
    color: '#10b981',
  },
  {
    id: 'cat_limites',
    slug: 'limites',
    name: 'Limites e individualidade',
    shortDescription: 'Espaço pessoal, família e amigos.',
    explanation:
      'Suas respostas indicam que equilibrar a vida a dois com o espaço individual — amizades, família, tempo para si — pode estar difícil. Limites saudáveis não afastam: eles protegem a relação e cada pessoa dentro dela.',
    color: '#d97706',
  },
];

// ─────────────────────────────── Módulos do livro ───────────────────────────────

export interface DemoModule {
  id: string;
  slug: string;
  title: string;
  subtitle: string;
  description: string;
  previewContent: string;
  content: string;
  priceCents: number;
  coverEmoji: string;
  categoryIds: string[];
}

const DEMO_NOTE =
  '> Conteúdo de demonstração. Substitua este texto pelo capítulo real do livro em **Admin → Módulos**.';

export const demoModules: DemoModule[] = [
  {
    id: 'mod_comunicacao',
    slug: 'comunicacao-que-aproxima',
    title: 'Comunicação que aproxima',
    subtitle: 'Módulo 1 · Como falar e escutar sem ruído',
    description:
      'Ferramentas práticas para falar sobre o que incomoda sem atacar, escutar sem se defender e transformar conversas difíceis em acordos possíveis.',
    priceCents: 2990,
    coverEmoji: '💬',
    categoryIds: ['cat_comunicacao'],
    previewContent: `## O que você vai encontrar
- Por que "a gente não conversa" quase sempre significa "eu não me sinto ouvido(a)"
- Um roteiro de 4 passos para falar de um incômodo sem que vire acusação
- Escuta ativa na prática: como mostrar que entendeu antes de responder
- Um ritual de 10 minutos por semana para manter o canal aberto

## Trecho do módulo
> Muitos casais acreditam que brigam por causa do assunto — a louça, o celular, a família. Na maior parte das vezes, porém, a briga é sobre outra coisa: sobre não se sentir levado a sério.

Quando um incômodo é dito em forma de acusação ("você **nunca**…", "você **sempre**…"), a outra pessoa se defende em vez de escutar. Neste módulo, vamos trocar a acusação por um pedido claro — e ver como isso muda o rumo da conversa.`,
    content: `${DEMO_NOTE}

## 1. O ruído mais comum
Quase toda conversa difícil tem duas camadas: o **assunto** (o que aconteceu) e a **relação** (o que aquilo significa para cada um). Quando só discutimos o assunto, a camada da relação continua machucando — e o tema volta.

## 2. O roteiro de 4 passos
- **Fato:** descreva o que aconteceu, sem adjetivos. "Ontem você chegou às 22h sem avisar."
- **Sentimento:** diga como você se sentiu. "Fiquei preocupado(a) e um pouco sozinho(a)."
- **Necessidade:** explique o que é importante para você. "Preciso saber que posso contar com um aviso."
- **Pedido:** proponha algo concreto e possível. "Pode me mandar uma mensagem quando atrasar?"

## 3. Escutar antes de responder
Antes de apresentar o seu lado, tente resumir o que a outra pessoa disse: "Deixa ver se entendi: você ficou chateado(a) porque…". Esse resumo não é concordância — é presença.

## Exercício da semana
Escolham um horário fixo de 10 minutos. Cada pessoa fala por 3 minutos sobre como foi a semana na relação, sem interrupções. Depois, cada um resume o que ouviu. Terminem com um agradecimento específico.`,
  },
  {
    id: 'mod_confianca',
    slug: 'confianca-se-constroi',
    title: 'Confiança se constrói',
    subtitle: 'Módulo 2 · Segurança emocional, ciúme e combinados',
    description:
      'Como entender a origem das inseguranças, lidar com o ciúme sem controle e criar combinados que tragam tranquilidade para os dois.',
    priceCents: 2990,
    coverEmoji: '🤝',
    categoryIds: ['cat_confianca'],
    previewContent: `## O que você vai encontrar
- A diferença entre sentir ciúme e agir a partir dele
- De onde vêm as inseguranças (e por que culpa não ajuda)
- Como criar combinados claros sobre redes sociais, amizades e privacidade
- Sinais de alerta que merecem atenção e apoio

## Trecho do módulo
> Confiança não é a ausência de dúvidas. É a experiência repetida de que, quando as dúvidas aparecem, existe espaço para falar sobre elas.

Sentir ciúme é humano. O problema começa quando o sentimento vira vigilância — e a vigilância, em vez de acalmar, alimenta ainda mais a insegurança.`,
    content: `${DEMO_NOTE}

## 1. Sentir não é o mesmo que agir
O ciúme é um sinal, não uma ordem. Perceber "estou inseguro(a) agora" é diferente de checar o celular da outra pessoa. O primeiro abre uma conversa; o segundo costuma fechá-la.

## 2. De onde vem a insegurança
Experiências anteriores, combinados que nunca foram falados em voz alta e fases de pouca conexão aumentam a sensação de ameaça. Mapear essas origens ajuda a tratar a causa, e não só o sintoma.

## 3. Combinados que acalmam
- Falem sobre expectativas de privacidade (celular, senhas, redes).
- Definam o que é "avisar" para cada um e em quais situações importa.
- Revisitem os combinados de tempos em tempos: eles podem mudar.

## Quando buscar ajuda
Se o controle se tornou frequente — vigiar, proibir contatos, exigir senhas — ou se existe medo, procure apoio profissional. Você não precisa lidar com isso sozinho(a).

## Exercício da semana
Cada pessoa escreve três situações que trazem segurança e três que trazem insegurança. Troquem as listas e conversem sobre um item de cada.`,
  },
  {
    id: 'mod_conflitos',
    slug: 'conflitos-sem-guerra',
    title: 'Conflitos sem guerra',
    subtitle: 'Módulo 3 · Discordar sem se ferir',
    description:
      'Estratégias para interromper escaladas, fazer pausas que funcionam e encerrar discussões com reparo — não com vencedores e perdedores.',
    priceCents: 2490,
    coverEmoji: '🕊️',
    categoryIds: ['cat_conflitos'],
    previewContent: `## O que você vai encontrar
- Os 3 momentos em que uma discussão sai do controle
- A "pausa combinada": como parar sem abandonar a conversa
- Tentativas de reparo — pequenos gestos que desarmam uma briga
- Como lidar com assuntos que sempre voltam

## Trecho do módulo
> Casais que se dão bem não brigam menos por acaso. Eles aprenderam a perceber quando a conversa deixou de ser sobre o problema e passou a ser sobre ganhar.`,
    content: `${DEMO_NOTE}

## 1. Como uma discussão escala
Quase sempre há um ponto de virada: o tom sobe, surgem generalizações ("você sempre…") e cada um passa a se defender. A partir daí, ninguém está mais escutando.

## 2. A pausa combinada
Combinem uma palavra ou gesto que signifique "preciso de um tempo". A pausa só funciona se tiver hora para acabar: "vamos retomar em 30 minutos". Durante a pausa, evite ensaiar argumentos — faça algo que acalme o corpo.

## 3. Reparar é mais importante que vencer
Uma piada leve, um "você tem razão nesse ponto", um toque na mão: tentativas de reparo reduzem a tensão. Aprender a oferecê-las — e a aceitá-las — muda o final das discussões.

## Segurança em primeiro lugar
Se as discussões envolvem ameaças, humilhações ou medo, isso não é um conflito comum. Busque ajuda especializada (veja os canais de apoio na página de resultado).

## Exercício da semana
Relembrem a última discussão e identifiquem juntos o momento exato em que ela escalou. O que cada um poderia ter feito ali?`,
  },
  {
    id: 'mod_intimidade',
    slug: 'perto-de-novo',
    title: 'Perto de novo',
    subtitle: 'Módulo 4 · Intimidade, carinho e tempo a dois',
    description:
      'Como recuperar a sensação de proximidade no meio da rotina: pequenos rituais, linguagem do carinho e tempo de qualidade de verdade.',
    priceCents: 2490,
    coverEmoji: '❤️',
    categoryIds: ['cat_intimidade'],
    previewContent: `## O que você vai encontrar
- Por que a distância cresce aos poucos (e sem culpados)
- Os "micro-momentos" que sustentam a conexão no dia a dia
- Como conversar sobre desejo e carinho sem constrangimento
- Um plano de 4 semanas para reaproximar

## Trecho do módulo
> A intimidade raramente acaba em um grande evento. Ela vai sendo substituída — pelo celular, pelas contas, pelo cansaço — até que um dia parece que vocês só dividem a agenda.`,
    content: `${DEMO_NOTE}

## 1. A distância silenciosa
Rotina não é inimiga do amor, mas ocupa espaço. Quando tudo vira logística, o casal deixa de se ver como casal. Perceber isso sem buscar culpados é o primeiro passo.

## 2. Micro-momentos
- Um cumprimento de verdade na chegada (olhar, abraço, 30 segundos).
- Uma pergunta curiosa por dia: "o que foi bom hoje?".
- Um elogio específico por semana.

## 3. Falar sobre carinho e desejo
Cada pessoa demonstra e percebe carinho de um jeito. Contar o que faz você se sentir amado(a) — sem cobrança — ajuda o outro a acertar mais vezes.

## Plano de 4 semanas
- **Semana 1:** 15 minutos por dia sem telas, juntos.
- **Semana 2:** um programa novo (pode ser simples).
- **Semana 3:** conversa sobre o que cada um sente falta.
- **Semana 4:** combinem um ritual que vão manter.`,
  },
  {
    id: 'mod_financas',
    slug: 'dinheiro-a-dois',
    title: 'Dinheiro a dois',
    subtitle: 'Módulo 5 · Combinados financeiros sem briga',
    description:
      'Um guia para conversar sobre dinheiro com transparência, dividir despesas de forma justa e alinhar planos sem transformar o assunto em disputa.',
    priceCents: 1990,
    coverEmoji: '💰',
    categoryIds: ['cat_financas'],
    previewContent: `## O que você vai encontrar
- Como a história de cada um com dinheiro influencia o casal
- Três modelos de divisão de despesas (e como escolher)
- A "reunião financeira" mensal em 30 minutos
- Como falar de dívidas sem vergonha nem acusação

## Trecho do módulo
> Brigas sobre dinheiro quase nunca são só sobre dinheiro. Elas falam de segurança, liberdade, reconhecimento — valores que cada um aprendeu de um jeito.`,
    content: `${DEMO_NOTE}

## 1. Cada um traz uma história
Quem cresceu com escassez tende a valorizar reserva; quem cresceu vendo o dinheiro como liberdade tende a valorizar experiências. Nenhum está errado — mas é preciso combinar.

## 2. Modelos de divisão
- **Tudo junto:** uma conta única para tudo.
- **Proporcional:** cada um contribui conforme a renda.
- **Híbrido:** conta conjunta para despesas comuns e contas individuais para o resto.

## 3. A reunião mensal
Uma vez por mês, 30 minutos: o que entrou, o que saiu, o que vem pela frente e um sonho em comum. Terminem com algo agradável — a conversa não pode ser só sobre problemas.

## Exercício da semana
Cada pessoa responde: "o que o dinheiro significa para mim?". Compartilhem as respostas antes de falar de números.`,
  },
  {
    id: 'mod_limites',
    slug: 'limites-saudaveis',
    title: 'Limites saudáveis',
    subtitle: 'Módulo 6 · Família, amigos e espaço pessoal',
    description:
      'Como proteger a relação da interferência externa, preservar a individualidade e combinar limites que respeitem os dois.',
    priceCents: 1990,
    coverEmoji: '🧭',
    categoryIds: ['cat_limites'],
    previewContent: `## O que você vai encontrar
- Por que limites aproximam em vez de afastar
- Como lidar com a família de origem sem "escolher lados"
- Espaço individual: amizades, hobbies e tempo sozinho(a)
- Frases prontas para dizer "não" com carinho

## Trecho do módulo
> Um casal é formado por duas pessoas inteiras. Quando uma delas precisa desaparecer para a relação funcionar, a relação perde — e as duas também.`,
    content: `${DEMO_NOTE}

## 1. Limite é cuidado
Dizer o que é aceitável para você não é egoísmo: é dar à outra pessoa a informação de que ela precisa para cuidar da relação.

## 2. Família de origem
Decisões do casal pertencem ao casal. Combinem juntos o que será compartilhado com a família e quem conversa com quem quando surgir um conflito.

## 3. Espaço individual
Ter amizades, hobbies e momentos sozinho(a) oxigena a relação. Combinem como equilibrar esse tempo com o tempo a dois.

## Frases úteis
- "Obrigado(a) pela preocupação, mas essa decisão é nossa."
- "Hoje eu preciso de um tempo para mim. Amanhã a gente faz algo juntos?"

## Exercício da semana
Listem, cada um, um limite que gostariam de propor. Conversem sobre como colocá-lo em prática.`,
  },
];

// ─────────────────────────────── Etapas e perguntas ───────────────────────────────

export interface DemoOption {
  id: string;
  label: string;
  weights?: Record<string, number>;
}

export interface DemoQuestion {
  id: string;
  text: string;
  helpText?: string;
  type: 'single' | 'multiple' | 'scale';
  required?: boolean;
  maxSelections?: number;
  scaleMinLabel?: string;
  scaleMaxLabel?: string;
  condition?: Condition;
  options: DemoOption[];
}

export interface DemoStage {
  id: string;
  title: string;
  description: string;
  offerModuleId?: string;
  priceQuestionEnabled?: boolean;
  priceQuestionMinScore?: number;
  questions: DemoQuestion[];
}

/** Escala 0–5 em que valores baixos indicam mais relevância do tema (ou o inverso, com `reverse`). */
function scale(prefix: string, categoryId: string, reverse = false): DemoOption[] {
  return [0, 1, 2, 3, 4, 5].map((value) => {
    const weight = reverse ? value : 5 - value;
    return { id: `${prefix}_${value}`, label: String(value), weights: weight > 0 ? { [categoryId]: weight } : {} };
  });
}

export const demoStages: DemoStage[] = [
  {
    id: 'stg_perfil',
    title: 'Seu momento',
    description: 'Para começar, conte um pouco sobre o relacionamento em que você está pensando.',
    questions: [
      {
        id: 'q_status',
        text: 'Qual frase descreve melhor o seu momento?',
        helpText: 'Se você não estiver em um relacionamento agora, responda pensando na sua relação mais recente.',
        type: 'single',
        options: [
          { id: 'opt_status_namoro', label: 'Estou namorando' },
          { id: 'opt_status_juntos', label: 'Somos casados ou moramos juntos' },
          { id: 'opt_status_semrotulo', label: 'Estamos juntos, mas sem rótulo definido' },
          { id: 'opt_status_solteiro', label: 'Estou solteiro(a), pensando na última relação' },
        ],
      },
      {
        id: 'q_tempo',
        text: 'Há quanto tempo vocês estão (ou ficaram) juntos?',
        type: 'single',
        options: [
          { id: 'opt_tempo_menos1', label: 'Menos de 1 ano' },
          { id: 'opt_tempo_1a3', label: 'De 1 a 3 anos' },
          { id: 'opt_tempo_3a7', label: 'De 3 a 7 anos' },
          { id: 'opt_tempo_mais7', label: 'Mais de 7 anos' },
        ],
      },
      {
        id: 'q_motivo',
        text: 'O que mais te trouxe até aqui?',
        helpText: 'Marque o que tem pesado mais para você agora.',
        type: 'multiple',
        maxSelections: 3,
        options: [
          { id: 'opt_motivo_brigas', label: 'Discussões frequentes', weights: { cat_conflitos: 2 } },
          { id: 'opt_motivo_ouvido', label: 'Sinto que não sou ouvido(a)', weights: { cat_comunicacao: 2 } },
          { id: 'opt_motivo_ciume', label: 'Ciúme ou insegurança', weights: { cat_confianca: 2 } },
          { id: 'opt_motivo_distancia', label: 'Falta de carinho ou de tempo juntos', weights: { cat_intimidade: 2 } },
          { id: 'opt_motivo_dinheiro', label: 'O dinheiro gera tensão', weights: { cat_financas: 2 } },
          { id: 'opt_motivo_familia', label: 'Família ou amigos interferem', weights: { cat_limites: 2 } },
          { id: 'opt_motivo_curiosidade', label: 'Só curiosidade — está tudo bem' },
        ],
      },
    ],
  },
  {
    id: 'stg_comunicacao',
    title: 'Como vocês conversam',
    description: 'Sobre a forma como vocês falam e escutam um ao outro.',
    offerModuleId: 'mod_comunicacao',
    questions: [
      {
        id: 'q_com_incomodo',
        text: 'Quando algo te incomoda na relação, o que costuma acontecer?',
        type: 'single',
        options: [
          { id: 'opt_com_inc_calma', label: 'Falo com calma e a gente resolve' },
          { id: 'opt_com_inc_naoouvido', label: 'Falo, mas sinto que não sou ouvido(a)', weights: { cat_comunicacao: 3, cat_intimidade: 1 } },
          { id: 'opt_com_inc_guardo', label: 'Guardo para mim para evitar briga', weights: { cat_comunicacao: 3, cat_conflitos: 1 } },
          { id: 'opt_com_inc_explodo', label: 'Acumulo até explodir', weights: { cat_comunicacao: 2, cat_conflitos: 3 } },
        ],
      },
      {
        id: 'q_com_escuta',
        text: 'De 0 a 5, o quanto você se sente realmente escutado(a)?',
        type: 'scale',
        scaleMinLabel: 'Nada',
        scaleMaxLabel: 'Totalmente',
        options: scale('opt_com_esc', 'cat_comunicacao'),
      },
      {
        id: 'q_com_evitados',
        text: 'Existem assuntos que vocês evitam por medo da reação do outro?',
        type: 'single',
        condition: { score: { categoryId: 'cat_comunicacao', op: 'gte', value: 50 } },
        options: [
          { id: 'opt_com_evit_nao', label: 'Não, falamos de tudo' },
          { id: 'opt_com_evit_poucos', label: 'Um ou dois assuntos', weights: { cat_comunicacao: 1, cat_confianca: 1 } },
          { id: 'opt_com_evit_varios', label: 'Vários assuntos', weights: { cat_comunicacao: 3, cat_confianca: 1 } },
        ],
      },
    ],
  },
  {
    id: 'stg_confianca',
    title: 'Confiança',
    description: 'Sobre segurança emocional e ciúme.',
    offerModuleId: 'mod_confianca',
    questions: [
      {
        id: 'q_conf_seguranca',
        text: 'O quanto você se sente seguro(a) de que pode contar com a outra pessoa?',
        type: 'scale',
        scaleMinLabel: 'Nada seguro(a)',
        scaleMaxLabel: 'Totalmente',
        options: scale('opt_conf_seg', 'cat_confianca'),
      },
      {
        id: 'q_conf_ciume',
        text: 'Com que frequência o ciúme aparece entre vocês?',
        type: 'single',
        options: [
          { id: 'opt_conf_ciume_nunca', label: 'Quase nunca' },
          { id: 'opt_conf_ciume_asvezes', label: 'De vez em quando, sem grandes problemas', weights: { cat_confianca: 1 } },
          { id: 'opt_conf_ciume_frequente', label: 'Com frequência, e gera discussões', weights: { cat_confianca: 3, cat_conflitos: 1 } },
          { id: 'opt_conf_ciume_sempre', label: 'Quase sempre, e isso me faz mal', weights: { cat_confianca: 4, cat_conflitos: 1 } },
        ],
      },
      {
        id: 'q_conf_controle',
        text: 'O ciúme costuma envolver checar celular, redes sociais ou controlar com quem a pessoa fala?',
        type: 'single',
        condition: {
          answer: {
            questionId: 'q_conf_ciume',
            op: 'selected',
            optionIds: ['opt_conf_ciume_frequente', 'opt_conf_ciume_sempre'],
          },
        },
        options: [
          { id: 'opt_conf_ctrl_nao', label: 'Não' },
          { id: 'opt_conf_ctrl_asvezes', label: 'Às vezes', weights: { cat_confianca: 2, cat_limites: 1 } },
          { id: 'opt_conf_ctrl_frequente', label: 'Sim, com frequência', weights: { cat_confianca: 3, cat_limites: 2 } },
        ],
      },
    ],
  },
  {
    id: 'stg_conflitos',
    title: 'Quando surgem desentendimentos',
    description: 'Sobre como as discussões começam e terminam.',
    offerModuleId: 'mod_conflitos',
    questions: [
      {
        id: 'q_confl_freq',
        text: 'Com que frequência vocês discutem de um jeito que deixa os dois mal?',
        type: 'single',
        options: [
          { id: 'opt_confl_freq_raro', label: 'Raramente' },
          { id: 'opt_confl_freq_mes', label: 'Algumas vezes por mês', weights: { cat_conflitos: 2 } },
          { id: 'opt_confl_freq_semana', label: 'Toda semana', weights: { cat_conflitos: 3 } },
          { id: 'opt_confl_freq_dia', label: 'Quase todo dia', weights: { cat_conflitos: 4 } },
        ],
      },
      {
        id: 'q_confl_fim',
        text: 'Como as discussões costumam terminar?',
        type: 'single',
        options: [
          { id: 'opt_confl_fim_acordo', label: 'Conversamos e chegamos a um acordo' },
          { id: 'opt_confl_fim_cede', label: 'Alguém cede só para acabar logo', weights: { cat_conflitos: 2, cat_comunicacao: 1 } },
          { id: 'opt_confl_fim_silencio', label: 'Ficamos dias sem nos falar', weights: { cat_conflitos: 3, cat_intimidade: 1 } },
          { id: 'opt_confl_fim_repete', label: 'O mesmo assunto volta sempre, sem solução', weights: { cat_conflitos: 3, cat_comunicacao: 2 } },
        ],
      },
      {
        id: 'q_confl_medo',
        text: 'Em algum momento você sente medo das reações da outra pessoa?',
        helpText: 'Esta pergunta existe para cuidarmos de você. Não existe resposta certa.',
        type: 'single',
        options: [
          { id: 'opt_confl_medo_nunca', label: 'Nunca' },
          { id: 'opt_confl_medo_raro', label: 'Raramente', weights: { cat_conflitos: 1 } },
          { id: 'opt_confl_medo_asvezes', label: 'Às vezes', weights: { cat_conflitos: 2 } },
          { id: 'opt_confl_medo_frequente', label: 'Com frequência', weights: { cat_conflitos: 3 } },
        ],
      },
    ],
  },
  {
    id: 'stg_intimidade',
    title: 'Proximidade e carinho',
    description: 'Sobre conexão, carinho e tempo a dois.',
    offerModuleId: 'mod_intimidade',
    questions: [
      {
        id: 'q_int_tempo',
        text: 'O quanto vocês têm tido momentos de qualidade juntos?',
        type: 'scale',
        scaleMinLabel: 'Quase nenhum',
        scaleMaxLabel: 'Muitos',
        options: scale('opt_int_tempo', 'cat_intimidade'),
      },
      {
        id: 'q_int_carinho',
        text: 'Como está o carinho no dia a dia (gestos, elogios, toque)?',
        type: 'single',
        options: [
          { id: 'opt_int_car_presente', label: 'Presente e me faz bem' },
          { id: 'opt_int_car_diminuiu', label: 'Diminuiu, mas ainda existe', weights: { cat_intimidade: 2 } },
          { id: 'opt_int_car_ausente', label: 'Quase não existe mais', weights: { cat_intimidade: 4 } },
          { id: 'opt_int_car_unilateral', label: 'Parece vir só de um lado', weights: { cat_intimidade: 3, cat_comunicacao: 1 } },
        ],
      },
      {
        id: 'q_int_rotina',
        text: 'A rotina da casa (tarefas, cansaço, contas) tem ocupado o espaço do casal?',
        type: 'single',
        condition: { answer: { questionId: 'q_status', op: 'selected', optionIds: ['opt_status_juntos'] } },
        options: [
          { id: 'opt_int_rot_nao', label: 'Não' },
          { id: 'opt_int_rot_pouco', label: 'Um pouco', weights: { cat_intimidade: 1, cat_limites: 1 } },
          { id: 'opt_int_rot_muito', label: 'Muito', weights: { cat_intimidade: 3, cat_conflitos: 1 } },
        ],
      },
    ],
  },
  {
    id: 'stg_financas',
    title: 'Dinheiro e decisões',
    description: 'Sobre como vocês lidam com dinheiro.',
    offerModuleId: 'mod_financas',
    questions: [
      {
        id: 'q_fin_divisao',
        text: 'Como vocês organizam as finanças?',
        type: 'single',
        options: [
          { id: 'opt_fin_div_separado', label: 'Cada um cuida do seu, sem despesas em comum' },
          { id: 'opt_fin_div_algumas', label: 'Dividimos algumas despesas', weights: { cat_financas: 1 } },
          { id: 'opt_fin_div_tudo', label: 'Temos tudo, ou quase tudo, em comum', weights: { cat_financas: 1 } },
        ],
      },
      {
        id: 'q_fin_tensao',
        text: 'O quanto o dinheiro gera tensão entre vocês?',
        type: 'scale',
        scaleMinLabel: 'Nenhuma',
        scaleMaxLabel: 'Muita',
        condition: {
          answer: { questionId: 'q_fin_divisao', op: 'notSelected', optionIds: ['opt_fin_div_separado'] },
        },
        options: scale('opt_fin_tensao', 'cat_financas', true),
      },
      {
        id: 'q_fin_transparencia',
        text: 'Vocês conversam abertamente sobre gastos, dívidas e planos?',
        type: 'single',
        condition: {
          answer: { questionId: 'q_fin_divisao', op: 'notSelected', optionIds: ['opt_fin_div_separado'] },
        },
        options: [
          { id: 'opt_fin_tr_sim', label: 'Sim, com transparência' },
          { id: 'opt_fin_tr_desconforto', label: 'Às vezes, com desconforto', weights: { cat_financas: 2, cat_comunicacao: 1 } },
          { id: 'opt_fin_tr_evitamos', label: 'Evitamos o assunto', weights: { cat_financas: 3, cat_comunicacao: 1 } },
          { id: 'opt_fin_tr_escondido', label: 'Existem gastos ou dívidas escondidos', weights: { cat_financas: 4, cat_confianca: 2 } },
        ],
      },
    ],
  },
  {
    id: 'stg_limites',
    title: 'Espaço, família e amigos',
    description: 'Sobre individualidade e as pessoas ao redor de vocês.',
    offerModuleId: 'mod_limites',
    questions: [
      {
        id: 'q_lim_familia',
        text: 'Família ou amigos interferem nas decisões do casal?',
        type: 'single',
        options: [
          { id: 'opt_lim_fam_nao', label: 'Não' },
          { id: 'opt_lim_fam_asvezes', label: 'Às vezes, mas conseguimos lidar', weights: { cat_limites: 1 } },
          { id: 'opt_lim_fam_frequente', label: 'Com frequência, e isso gera atrito', weights: { cat_limites: 3, cat_conflitos: 1 } },
          { id: 'opt_lim_fam_semapoio', label: 'Sim, e sinto que a outra pessoa não me apoia nisso', weights: { cat_limites: 4, cat_confianca: 1 } },
        ],
      },
      {
        id: 'q_lim_espaco',
        text: 'O quanto você sente que tem espaço para ser você mesmo(a) — amizades, hobbies, tempo sozinho(a)?',
        type: 'scale',
        scaleMinLabel: 'Nenhum',
        scaleMaxLabel: 'Todo o espaço',
        options: scale('opt_lim_espaco', 'cat_limites'),
      },
    ],
  },
];

// ─────────────────────────────── Regras condicionais ───────────────────────────────

export interface DemoRule {
  id: string;
  name: string;
  description: string;
  priority: number;
  condition: Condition;
  effects: RuleEffect[];
}

export const demoRules: DemoRule[] = [
  {
    id: 'rule_apoio',
    name: 'Sinal de cuidado: medo ou controle',
    description:
      'Quando a pessoa relata medo das reações do outro ou controle frequente, o resultado mostra primeiro os canais de apoio, antes de qualquer oferta.',
    priority: 100,
    condition: {
      any: [
        {
          answer: {
            questionId: 'q_confl_medo',
            op: 'selected',
            optionIds: ['opt_confl_medo_asvezes', 'opt_confl_medo_frequente'],
          },
        },
        { answer: { questionId: 'q_conf_controle', op: 'selected', optionIds: ['opt_conf_ctrl_frequente'] } },
      ],
    },
    effects: [{ type: 'addFlag', flag: 'safety_support' }],
  },
  {
    id: 'rule_controle_limites',
    name: 'Ciúme com controle também é tema de limites',
    description: 'Comportamentos de controle reforçam o tema "Limites e individualidade".',
    priority: 50,
    condition: {
      answer: {
        questionId: 'q_conf_controle',
        op: 'selected',
        optionIds: ['opt_conf_ctrl_asvezes', 'opt_conf_ctrl_frequente'],
      },
    },
    effects: [{ type: 'addScore', categoryId: 'cat_limites', value: 10 }],
  },
  {
    id: 'rule_explosao',
    name: 'Acúmulo que vira explosão',
    description:
      'Quem acumula até explodir e tem conflitos intensos também se beneficia do módulo de comunicação.',
    priority: 40,
    condition: {
      all: [
        { answer: { questionId: 'q_com_incomodo', op: 'selected', optionIds: ['opt_com_inc_explodo'] } },
        { score: { categoryId: 'cat_conflitos', op: 'gte', value: 50 } },
      ],
    },
    effects: [
      { type: 'addScore', categoryId: 'cat_comunicacao', value: 5 },
      { type: 'recommendModule', moduleId: 'mod_comunicacao' },
    ],
  },
  {
    id: 'rule_dinheiro_escondido',
    name: 'Gastos escondidos afetam a confiança',
    description: 'Segredos financeiros também são um tema de confiança.',
    priority: 30,
    condition: { answer: { questionId: 'q_fin_transparencia', op: 'selected', optionIds: ['opt_fin_tr_escondido'] } },
    effects: [{ type: 'addScore', categoryId: 'cat_confianca', value: 10 }],
  },
  {
    id: 'rule_rotina',
    name: 'Rotina desgastante reforça o tema conexão',
    description: 'Para quem mora junto e sente a rotina ocupando o espaço do casal.',
    priority: 10,
    condition: {
      all: [
        { answer: { questionId: 'q_status', op: 'selected', optionIds: ['opt_status_juntos'] } },
        { answer: { questionId: 'q_int_rotina', op: 'selected', optionIds: ['opt_int_rot_muito'] } },
      ],
    },
    effects: [{ type: 'multiplyScore', categoryId: 'cat_intimidade', factor: 1.15 }],
  },
];

// ─────────────────────────────── Configurações ───────────────────────────────

export const demoSettings: {
  engine: EngineSettings;
  pricing: { comboDiscountPercent: number; comboMinItems: number; maxInstallments: number; minInstallmentCents: number };
  payment: { pixExpirationMinutes: number; boletoDueDays: number };
} = {
  engine: { primaryMinScore: 35, secondaryMinScore: 30, maxSecondary: 2 },
  pricing: { comboDiscountPercent: 15, comboMinItems: 2, maxInstallments: 3, minInstallmentCents: 500 },
  payment: { pixExpirationMinutes: 30, boletoDueDays: 3 },
};
