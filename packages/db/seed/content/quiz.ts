/**
 * Quiz "Qual é o seu módulo ideal?" — categorias, etapas, perguntas e regras.
 *
 * As perguntas seguem o roteiro de objeções de venda do livro: primeiro o momento da pessoa,
 * depois "você em primeiro lugar" (cuidar de si é a base do método), em seguida as etapas do
 * tema que ela escolheu e, por fim, o que a faria se sentir segura para começar (tempo, valor,
 * garantia). As respostas desta última etapa geram sinalizadores (`objecao_*`) que mostram no
 * resultado as respostas às dúvidas dela.
 *
 * Cada etapa temática termina com a pergunta de concordância com o valor do módulo.
 * Os pesos apontam apenas para categorias cuja etapa fica visível no mesmo caminho (ou para
 * "Amor-próprio", sempre visível), para que nenhum tema fique inflado por uma única resposta.
 */

import type { ContentCategory, ContentOption, ContentRule, ContentStage } from './types';

// ─────────────────────────────── Categorias (uma por módulo) ───────────────────────────────

export const courseCategories: ContentCategory[] = [
  {
    id: 'cat_amor_proprio',
    slug: 'amor-proprio',
    name: 'Amor-próprio e autoconhecimento',
    shortDescription: 'Saber quem você é, o que valoriza e o que merece.',
    explanation:
      'Suas respostas sugerem que olhar para você mesma pode ser o passo mais importante agora. Isso não é defeito nem diagnóstico: depois de decepções, rotina ou términos, é muito comum a gente se colocar em segundo plano. No Fórmula do Amor, tudo começa aqui. Quando você sabe quem é, o que valoriza e o que merece, escolhe melhor e é escolhida pelo motivo certo. Não é correr atrás de ninguém, é redescobrir o seu valor.',
    color: '#e11d48',
  },
  {
    id: 'cat_conquista',
    slug: 'conquista',
    name: 'Conquista e primeiros encontros',
    shortDescription: 'Despertar interesse sendo você mesma, do primeiro papo ao primeiro encontro.',
    explanation:
      'Suas respostas mostram que o momento da conquista (conhecer alguém, despertar interesse, conduzir os primeiros encontros) é onde você mais quer avançar. Não existe habilidade mágica para isso. Existem atitudes simples, como ser autêntica, elogiar na medida e conversar de mão dupla, que fazem muita diferença.',
    color: '#f97316',
  },
  {
    id: 'cat_comunicacao',
    slug: 'comunicacao',
    name: 'Conversa e conexão',
    shortDescription: 'Ter assunto, ouvir de verdade e falar de sentimentos sem pressão.',
    explanation:
      'Algumas respostas apontam que as conversas, seja pela falta de assunto, seja porque viram discussão, podem estar pesando. Isso é muito comum: quase ninguém aprende a conversar sobre temas difíceis. Comunicação é uma habilidade, e habilidade se treina.',
    color: '#8b5cf6',
  },
  {
    id: 'cat_romance',
    slug: 'romance',
    name: 'Romance e encanto',
    shortDescription: 'Manter a chama acesa com gestos, presentes e surpresas.',
    explanation:
      'Suas respostas sugerem que a rotina pode ter ocupado o espaço do romance. Acontece com quase todo casal e não significa falta de amor. Pequenos gestos, presentes feitos por você e surpresas bem pensadas costumam devolver o encanto mais rápido do que se imagina.',
    color: '#ec4899',
  },
  {
    id: 'cat_confianca',
    slug: 'confianca',
    name: 'Confiança e ciúme',
    shortDescription: 'Lidar com a desconfiança sem paranoia e, se preciso, com a traição.',
    explanation:
      'Ciúme, desconfiança ou feridas de traição apareceram nas suas respostas. Esses sentimentos merecem acolhimento, não culpa. O caminho costuma passar por separar fatos de palpites, cuidar das bagagens antigas e trocar a vigilância pela conversa.',
    color: '#0ea5e9',
  },
  {
    id: 'cat_crise',
    slug: 'crise',
    name: 'Crise e reconciliação',
    shortDescription: 'Quando a relação balança: entender o problema e agir com calma.',
    explanation:
      'Suas respostas indicam que a relação pode estar passando por um momento de crise. Crise não é sentença de fim: muitas vezes, é o sinal de que algo precisa ser olhado com cuidado. Identificar o problema real, fazer a sua parte e conversar de verdade são os primeiros passos.',
    color: '#d97706',
  },
  {
    id: 'cat_termino',
    slug: 'termino',
    name: 'Término e recomeço',
    shortDescription: 'Atravessar a dor do fim e decidir, com clareza, se vale tentar de novo.',
    explanation:
      'O fim de uma relação apareceu com força nas suas respostas. Términos doem, e é importante se permitir sentir. Antes de qualquer tentativa de reconquista, vale responder com honestidade se a volta faz bem para você. E, se a resposta for seguir em frente, dá para sair dessa fase mais forte.',
    color: '#6366f1',
  },
  {
    id: 'cat_compromisso',
    slug: 'compromisso',
    name: 'Relação duradoura',
    shortDescription: 'Atravessar as fases do relacionamento e construir parceria.',
    explanation:
      'Suas respostas falam de uma relação que quer durar e que talvez esteja numa fase de ajustes: fim da lua de mel, disputas ou desequilíbrio nas tarefas e na atenção. Toda relação passa por fases. Entender em qual vocês estão e construir uma parceria de igual para igual faz toda a diferença.',
    color: '#059669',
  },
];

// ─────────────────────────────── Etapas e perguntas ───────────────────────────────

/** Escala 0–5 em que valores baixos indicam mais relevância do tema. */
function scale(prefix: string, categoryId: string): ContentOption[] {
  return [0, 1, 2, 3, 4, 5].map((value) => {
    const weight = 5 - value;
    return { id: `${prefix}_${value}`, label: String(value), weights: weight > 0 ? { [categoryId]: weight } : {} };
  });
}

const EM_RELACAO = ['opt_momento_namorando', 'opt_momento_casada', 'opt_momento_crise'];
const DEPOIS_DO_FIM = ['opt_momento_ex', 'opt_momento_superar'];

export const courseStages: ContentStage[] = [
  {
    id: 'stg_momento',
    title: 'Seu momento',
    description: 'Para começar, conte um pouco sobre o seu momento no amor.',
    questions: [
      {
        id: 'q_momento',
        text: 'Qual frase descreve melhor o seu momento no amor?',
        helpText: 'Não existe resposta certa. Escolha a que mais se parece com você hoje.',
        type: 'single',
        options: [
          { id: 'opt_momento_solteira', label: 'Estou solteira e quero encontrar alguém especial', weights: { cat_conquista: 3 } },
          { id: 'opt_momento_crush', label: 'Estou interessada em alguém e quero conquistá-lo', weights: { cat_conquista: 4 } },
          { id: 'opt_momento_namorando', label: 'Estou namorando e quero fortalecer a relação', weights: { cat_compromisso: 2 } },
          { id: 'opt_momento_casada', label: 'Sou casada ou moramos juntos', weights: { cat_compromisso: 2 } },
          { id: 'opt_momento_crise', label: 'Estamos juntos, mas a relação está balançando', weights: { cat_crise: 4 } },
          { id: 'opt_momento_ex', label: 'Terminamos e eu penso em reconquistá-lo', weights: { cat_termino: 4 } },
          { id: 'opt_momento_superar', label: 'Terminamos e eu quero seguir em frente', weights: { cat_termino: 3, cat_amor_proprio: 2 } },
        ],
      },
      {
        id: 'q_desafio',
        text: 'O que mais tem pesado no seu coração?',
        type: 'multiple',
        maxSelections: 2,
        options: [
          { id: 'opt_desafio_inseguranca', label: 'Insegurança comigo mesma', weights: { cat_amor_proprio: 3 } },
          { id: 'opt_desafio_atrair', label: 'Não consigo despertar o interesse de quem eu quero', weights: { cat_conquista: 3 } },
          { id: 'opt_desafio_conversa', label: 'Conversas difíceis ou falta de assunto', weights: { cat_comunicacao: 3 } },
          { id: 'opt_desafio_rotina', label: 'A rotina esfriou o romance', weights: { cat_romance: 3 } },
          { id: 'opt_desafio_ciume', label: 'Ciúme ou desconfiança', weights: { cat_confianca: 3 } },
          { id: 'opt_desafio_brigas', label: 'Brigas e distância entre nós', weights: { cat_crise: 3 } },
          { id: 'opt_desafio_saudade', label: 'Saudade de quem já foi', weights: { cat_termino: 3 } },
          { id: 'opt_desafio_futuro', label: 'Não sei se ele é a pessoa certa para mim', weights: { cat_amor_proprio: 2 } },
        ],
      },
      {
        id: 'q_ajuda',
        text: 'Como você se sente ao buscar ajuda para a sua vida amorosa?',
        type: 'single',
        options: [
          { id: 'opt_ajuda_tranquila', label: 'Tranquila: gosto de aprender e evoluir' },
          { id: 'opt_ajuda_vergonha', label: 'Com um pouco de vergonha, como se estivesse "correndo atrás"', weights: { cat_amor_proprio: 3 } },
          { id: 'opt_ajuda_decepcao', label: 'Desconfiada: já me decepcionei com promessas parecidas' },
          { id: 'opt_ajuda_semvolta', label: 'Desanimada: sinto que a minha situação não tem mais jeito', weights: { cat_amor_proprio: 1 } },
        ],
      },
    ],
  },
  {
    id: 'stg_voce',
    title: 'Você em primeiro lugar',
    description: 'O método começa por você: pelo que você sente, quer e merece.',
    offerModuleId: 'mod_amor_proprio',
    questions: [
      {
        id: 'q_valor',
        text: 'De 0 a 5, o quanto você sente que conhece o seu valor e sabe o que merece numa relação?',
        type: 'scale',
        scaleMinLabel: 'Nada',
        scaleMaxLabel: 'Totalmente',
        options: scale('opt_valor', 'cat_amor_proprio'),
      },
      {
        id: 'q_fachada',
        text: 'Quando você se interessa por alguém, o que costuma acontecer?',
        type: 'single',
        options: [
          { id: 'opt_fachada_natural', label: 'Continuo sendo eu mesma' },
          { id: 'opt_fachada_agradar', label: 'Mudo o meu jeito para agradar', weights: { cat_amor_proprio: 3 } },
          { id: 'opt_fachada_anular', label: 'Coloco a vida dele na frente da minha', weights: { cat_amor_proprio: 4 } },
          { id: 'opt_fachada_fechar', label: 'Fico insegura e acabo me fechando', weights: { cat_amor_proprio: 3 } },
        ],
      },
      {
        id: 'q_grandes_questoes',
        text: 'Você sabe o que é inegociável para você numa relação, como ter filhos, o jeito de lidar com dinheiro e o estilo de vida?',
        type: 'single',
        options: [
          { id: 'opt_gq_sim', label: 'Sei, e falo sobre isso com tranquilidade' },
          { id: 'opt_gq_evito', label: 'Sei, mas evito tocar no assunto', weights: { cat_amor_proprio: 2 } },
          { id: 'opt_gq_nao', label: 'Nunca parei para pensar nisso', weights: { cat_amor_proprio: 3 } },
        ],
      },
      {
        id: 'q_seguranca',
        text: 'Nessa relação, você já sentiu medo dele ou passou por humilhações, ameaças ou agressões?',
        helpText: 'Esta pergunta existe para cuidarmos de você. Suas respostas são confidenciais.',
        type: 'single',
        condition: { answer: { questionId: 'q_momento', op: 'selected', optionIds: [...EM_RELACAO, ...DEPOIS_DO_FIM] } },
        options: [
          { id: 'opt_seguranca_nunca', label: 'Nunca' },
          { id: 'opt_seguranca_algumas', label: 'Uma vez ou outra' },
          { id: 'opt_seguranca_frequente', label: 'Com frequência' },
          { id: 'opt_seguranca_prefiro', label: 'Prefiro não responder' },
        ],
      },
    ],
  },
  {
    id: 'stg_conquista',
    title: 'A conquista',
    description: 'Sobre como você conhece pessoas e conduz os primeiros encontros.',
    offerModuleId: 'mod_conquista',
    condition: {
      any: [
        { answer: { questionId: 'q_momento', op: 'selected', optionIds: ['opt_momento_solteira', 'opt_momento_crush'] } },
        { answer: { questionId: 'q_desafio', op: 'selected', optionIds: ['opt_desafio_atrair'] } },
      ],
    },
    questions: [
      {
        id: 'q_conq_onde',
        text: 'Onde você costuma conhecer pessoas?',
        type: 'single',
        options: [
          { id: 'opt_onde_rotina', label: 'Na rotina: trabalho, estudos, amigos em comum', weights: { cat_conquista: 1 } },
          { id: 'opt_onde_apps', label: 'Em aplicativos e redes sociais', weights: { cat_conquista: 2 } },
          { id: 'opt_onde_hobbies', label: 'Em atividades e eventos de que eu gosto' },
          { id: 'opt_onde_poucas', label: 'Quase não conheço gente nova', weights: { cat_conquista: 3, cat_amor_proprio: 1 } },
        ],
      },
      {
        id: 'q_conq_postura',
        text: 'Quando a conversa começa a ficar interessante, você tende a…',
        type: 'single',
        options: [
          { id: 'opt_postura_equilibrio', label: 'Falar e ouvir na medida: tudo flui' },
          { id: 'opt_postura_ouvir', label: 'Só ouvir e deixar ele falar o tempo todo', weights: { cat_conquista: 2 } },
          { id: 'opt_postura_elogios', label: 'Exagerar nos elogios para mostrar interesse', weights: { cat_conquista: 3 } },
          { id: 'opt_postura_personagem', label: 'Dizer o que eu acho que ele quer ouvir', weights: { cat_conquista: 2, cat_amor_proprio: 2 } },
        ],
      },
      {
        id: 'q_conq_online',
        text: 'Quando você conhece alguém pela internet, como costuma conduzir?',
        type: 'single',
        condition: { answer: { questionId: 'q_conq_onde', op: 'selected', optionIds: ['opt_onde_apps'] } },
        options: [
          { id: 'opt_online_calma', label: 'Vou com calma e marco o encontro em lugar público' },
          { id: 'opt_online_rapido', label: 'Me envolvo rápido, antes de conhecer pessoalmente', weights: { cat_conquista: 3 } },
          { id: 'opt_online_nuncasai', label: 'A conversa nunca sai do online', weights: { cat_conquista: 3 } },
        ],
      },
    ],
  },
  {
    id: 'stg_conversas',
    title: 'Conversas',
    description: 'Sobre assunto, escuta e sentimentos.',
    offerModuleId: 'mod_conversas',
    condition: { answer: { questionId: 'q_desafio', op: 'selected', optionIds: ['opt_desafio_conversa'] } },
    questions: [
      {
        id: 'q_conv_assunto',
        text: 'Como costumam ser as conversas com ele (ou com quem você se interessa)?',
        type: 'single',
        options: [
          { id: 'opt_assunto_flui', label: 'Fluem fácil: temos muito em comum' },
          { id: 'opt_assunto_falta', label: 'Às vezes falta assunto', weights: { cat_comunicacao: 3 } },
          { id: 'opt_assunto_superficial', label: 'Falamos do dia a dia, nunca de sentimentos', weights: { cat_comunicacao: 3 } },
          { id: 'opt_assunto_discussao', label: 'Quase toda conversa vira discussão', weights: { cat_comunicacao: 3 } },
        ],
      },
      {
        id: 'q_conv_escuta',
        text: 'De 0 a 5, o quanto vocês realmente se escutam, sem tentar "ganhar" a conversa?',
        type: 'scale',
        scaleMinLabel: 'Nada',
        scaleMaxLabel: 'Totalmente',
        options: scale('opt_escuta', 'cat_comunicacao'),
      },
      {
        id: 'q_conv_sentimentos',
        text: 'Falar sobre sentimentos e sobre a relação, para você, é…',
        type: 'single',
        options: [
          { id: 'opt_sentimentos_natural', label: 'Natural' },
          { id: 'opt_sentimentos_dificil', label: 'Difícil, mas possível', weights: { cat_comunicacao: 2 } },
          { id: 'opt_sentimentos_evito', label: 'Algo que eu evito para não parecer chata', weights: { cat_comunicacao: 3, cat_amor_proprio: 1 } },
        ],
      },
    ],
  },
  {
    id: 'stg_romance',
    title: 'Romance',
    description: 'Sobre o encanto no dia a dia de vocês.',
    offerModuleId: 'mod_romance',
    condition: { answer: { questionId: 'q_desafio', op: 'selected', optionIds: ['opt_desafio_rotina'] } },
    questions: [
      {
        id: 'q_rom_clima',
        text: 'Como está o romance no dia a dia de vocês?',
        type: 'single',
        options: [
          { id: 'opt_clima_vivo', label: 'Vivo: sempre tem um carinho ou uma surpresa' },
          { id: 'opt_clima_morno', label: 'Morno: a rotina tomou conta', weights: { cat_romance: 3 } },
          { id: 'opt_clima_sumiu', label: 'Quase não existe mais', weights: { cat_romance: 4 } },
          { id: 'opt_clima_soeu', label: 'Parece que só eu me esforço', weights: { cat_romance: 2, cat_amor_proprio: 1 } },
        ],
      },
      {
        id: 'q_rom_ideias',
        text: 'Quando você quer agradar ou surpreender ele…',
        type: 'single',
        options: [
          { id: 'opt_ideias_sobram', label: 'Tenho ideias e coloco em prática' },
          { id: 'opt_ideias_faltam', label: 'Quero, mas me faltam ideias', weights: { cat_romance: 3 } },
          { id: 'opt_ideias_pronto', label: 'Acabo sempre comprando algo pronto', weights: { cat_romance: 2 } },
          { id: 'opt_ideias_vergonha', label: 'Tenho medo de parecer exagerada ou brega', weights: { cat_romance: 2, cat_amor_proprio: 1 } },
        ],
      },
    ],
  },
  {
    id: 'stg_confianca',
    title: 'Confiança',
    description: 'Sobre ciúme, desconfiança e traição.',
    offerModuleId: 'mod_confianca',
    condition: { answer: { questionId: 'q_desafio', op: 'selected', optionIds: ['opt_desafio_ciume'] } },
    questions: [
      {
        id: 'q_conf_frequencia',
        text: 'Com que frequência o ciúme ou a desconfiança aparecem?',
        type: 'single',
        options: [
          { id: 'opt_frequencia_raro', label: 'Quase nunca' },
          { id: 'opt_frequencia_asvezes', label: 'De vez em quando', weights: { cat_confianca: 1 } },
          { id: 'opt_frequencia_frequente', label: 'Com frequência, e isso gera discussões', weights: { cat_confianca: 3 } },
          { id: 'opt_frequencia_sempre', label: 'Quase sempre, e isso me faz mal', weights: { cat_confianca: 4, cat_amor_proprio: 1 } },
        ],
      },
      {
        id: 'q_conf_origem',
        text: 'Quando a desconfiança aparece, ela costuma vir de…',
        type: 'single',
        options: [
          { id: 'opt_origem_fatos', label: 'Fatos concretos que eu vi', weights: { cat_confianca: 2 } },
          { id: 'opt_origem_palpite', label: 'Um palpite ou um comportamento estranho dele', weights: { cat_confianca: 3 } },
          { id: 'opt_origem_boatos', label: 'Coisas que outras pessoas me contaram', weights: { cat_confianca: 3 } },
          { id: 'opt_origem_passado', label: 'Feridas de relações passadas', weights: { cat_confianca: 2, cat_amor_proprio: 2 } },
        ],
      },
      {
        id: 'q_conf_traicao',
        text: 'Já houve traição nesta relação?',
        helpText: 'Pergunta opcional: você pode pular.',
        type: 'single',
        required: false,
        options: [
          { id: 'opt_traicao_nao', label: 'Não' },
          { id: 'opt_traicao_desconfio', label: 'Não sei, desconfio', weights: { cat_confianca: 2 } },
          { id: 'opt_traicao_umavez', label: 'Sim, uma vez', weights: { cat_confianca: 3 } },
          { id: 'opt_traicao_repetida', label: 'Sim, mais de uma vez', weights: { cat_confianca: 4, cat_amor_proprio: 2 } },
        ],
      },
    ],
  },
  {
    id: 'stg_crise',
    title: 'Quando a relação balança',
    description: 'Sobre o que está pesando entre vocês agora.',
    offerModuleId: 'mod_crise',
    condition: {
      any: [
        { answer: { questionId: 'q_momento', op: 'selected', optionIds: ['opt_momento_crise'] } },
        { answer: { questionId: 'q_desafio', op: 'selected', optionIds: ['opt_desafio_brigas'] } },
      ],
    },
    questions: [
      {
        id: 'q_crise_problema',
        text: 'Você sabe dizer qual é o principal problema entre vocês hoje?',
        type: 'single',
        options: [
          { id: 'opt_problema_conversado', label: 'Sei, e já conversamos sobre ele', weights: { cat_crise: 1 } },
          { id: 'opt_problema_semconversa', label: 'Sei, mas não conseguimos falar sem brigar', weights: { cat_crise: 3 } },
          { id: 'opt_problema_naosei', label: 'Não sei: parece que tudo incomoda', weights: { cat_crise: 4 } },
        ],
      },
      {
        id: 'q_crise_sentimento',
        text: 'E o sentimento entre vocês?',
        type: 'single',
        options: [
          { id: 'opt_sentimento_ambos', label: 'Ainda nos amamos, só estamos perdidos', weights: { cat_crise: 2 } },
          { id: 'opt_sentimento_soeu', label: 'Eu amo, mas não sei se ele ainda sente o mesmo', weights: { cat_crise: 3, cat_amor_proprio: 1 } },
          { id: 'opt_sentimento_confusa', label: 'Nem sei mais o que sinto', weights: { cat_crise: 2, cat_amor_proprio: 2 } },
        ],
      },
      {
        id: 'q_crise_desculpas',
        text: 'Quando um de vocês erra, o pedido de desculpas…',
        type: 'single',
        options: [
          { id: 'opt_desculpas_sincero', label: 'Acontece com sinceridade, e a gente segue' },
          { id: 'opt_desculpas_orgulho', label: 'Quase nunca acontece: sobra orgulho', weights: { cat_crise: 3 } },
          { id: 'opt_desculpas_repete', label: 'Acontece, mas o mesmo erro se repete', weights: { cat_crise: 3 } },
        ],
      },
    ],
  },
  {
    id: 'stg_termino',
    title: 'Depois do término',
    description: 'Sobre o fim da relação e o que você quer daqui para a frente.',
    offerModuleId: 'mod_termino',
    condition: {
      any: [
        { answer: { questionId: 'q_momento', op: 'selected', optionIds: DEPOIS_DO_FIM } },
        { answer: { questionId: 'q_desafio', op: 'selected', optionIds: ['opt_desafio_saudade'] } },
      ],
    },
    questions: [
      {
        id: 'q_term_quando',
        text: 'Há quanto tempo vocês terminaram?',
        type: 'single',
        options: [
          { id: 'opt_quando_recente', label: 'Menos de 1 mês', weights: { cat_termino: 3 } },
          { id: 'opt_quando_meses', label: 'De 1 a 6 meses', weights: { cat_termino: 2 } },
          { id: 'opt_quando_mais', label: 'Mais de 6 meses', weights: { cat_termino: 1 } },
          { id: 'opt_quando_naoterminamos', label: 'Ainda não terminamos, mas sinto que está perto', weights: { cat_termino: 1 } },
        ],
      },
      {
        id: 'q_term_motivo',
        text: 'Se você pensa em voltar, qual é o principal motivo?',
        type: 'single',
        options: [
          { id: 'opt_motivo_amor', label: 'Ainda o amo e acredito que pode dar certo', weights: { cat_termino: 2 } },
          { id: 'opt_motivo_vazio', label: 'Minha vida perdeu o rumo sem ele', weights: { cat_termino: 2, cat_amor_proprio: 3 } },
          { id: 'opt_motivo_sozinha', label: 'Tenho medo de ficar sozinha', weights: { cat_termino: 2, cat_amor_proprio: 3 } },
          { id: 'opt_motivo_seguir', label: 'Não penso em voltar: quero seguir em frente', weights: { cat_termino: 2, cat_amor_proprio: 1 } },
        ],
      },
      {
        id: 'q_term_contato',
        text: 'Como está o contato entre vocês hoje?',
        type: 'single',
        options: [
          { id: 'opt_contato_amigavel', label: 'Conversamos de forma amigável', weights: { cat_termino: 1 } },
          { id: 'opt_contato_frio', label: 'Falamos pouco, e é frio', weights: { cat_termino: 2 } },
          { id: 'opt_contato_nenhum', label: 'Não temos contato', weights: { cat_termino: 2 } },
          { id: 'opt_contato_conflito', label: 'Quando falamos, brigamos ou eu me exponho demais', weights: { cat_termino: 3, cat_amor_proprio: 1 } },
        ],
      },
    ],
  },
  {
    id: 'stg_compromisso',
    title: 'Amor que dura',
    description: 'Sobre a fase da relação e o equilíbrio entre vocês.',
    offerModuleId: 'mod_compromisso',
    condition: {
      answer: { questionId: 'q_momento', op: 'selected', optionIds: ['opt_momento_namorando', 'opt_momento_casada'] },
    },
    questions: [
      {
        id: 'q_comp_fase',
        text: 'Em qual fase vocês parecem estar?',
        type: 'single',
        options: [
          { id: 'opt_fase_encanto', label: 'Encantamento: tudo é novo e maravilhoso', weights: { cat_compromisso: 1 } },
          { id: 'opt_fase_rotina', label: 'A lua de mel acabou e os defeitos apareceram', weights: { cat_compromisso: 3 } },
          { id: 'opt_fase_disputa', label: 'Disputa: ninguém quer ceder', weights: { cat_compromisso: 3 } },
          { id: 'opt_fase_parceria', label: 'Parceria: aceitamos as diferenças um do outro' },
        ],
      },
      {
        id: 'q_comp_equilibrio',
        text: 'Como está o equilíbrio entre vocês (tarefas, atenção e espaço)?',
        type: 'single',
        options: [
          { id: 'opt_equilibrio_justo', label: 'Justo: cada um faz a sua parte e tem o seu espaço' },
          { id: 'opt_equilibrio_eu', label: 'Eu faço quase tudo', weights: { cat_compromisso: 3, cat_amor_proprio: 2 } },
          { id: 'opt_equilibrio_cobro', label: 'Sinto falta de atenção e acabo cobrando', weights: { cat_compromisso: 2 } },
          { id: 'opt_equilibrio_distantes', label: 'Cada um vive a sua vida, sem muito interesse pelo outro', weights: { cat_compromisso: 3 } },
        ],
      },
    ],
  },
  {
    id: 'stg_comeco',
    title: 'Seu jeito de começar',
    description: 'Por último, o que faria você se sentir segura para dar o próximo passo.',
    questions: [
      {
        id: 'q_tempo_dia',
        text: 'Quanto tempo por dia você teria para se dedicar ao seu momento amoroso?',
        type: 'single',
        options: [
          { id: 'opt_tempo_5', label: 'Uns 5 minutinhos' },
          { id: 'opt_tempo_15', label: 'De 10 a 20 minutos' },
          { id: 'opt_tempo_30', label: 'Meia hora ou mais' },
        ],
      },
      {
        id: 'q_para_comecar',
        text: 'O que faria você se sentir mais segura para começar?',
        type: 'single',
        options: [
          { id: 'opt_comecar_garantia', label: 'Ter garantia de que posso pedir meu dinheiro de volta' },
          { id: 'opt_comecar_preco', label: 'Um valor que caiba no meu bolso' },
          { id: 'opt_comecar_previa', label: 'Ver uma prévia antes de decidir' },
          { id: 'opt_comecar_funciona', label: 'Ter certeza de que funciona para o meu caso' },
          { id: 'opt_comecar_pronta', label: 'Nada: já me sinto pronta para começar' },
        ],
      },
    ],
  },
];

// ─────────────────────────────── Regras condicionais ───────────────────────────────

const flagWhen = (id: string, name: string, questionId: string, optionIds: string[], flag: string): ContentRule => ({
  id,
  name,
  description: `Mostra no resultado a resposta à dúvida "${flag}".`,
  priority: 20,
  condition: { answer: { questionId, op: 'selected', optionIds } },
  effects: [{ type: 'addFlag', flag }],
});

export const courseRules: ContentRule[] = [
  {
    id: 'rule_seguranca',
    name: 'Sinal de cuidado: medo, humilhação ou agressão',
    description:
      'Quando a pessoa relata medo, humilhações, ameaças ou agressões, o resultado mostra primeiro os canais de apoio e indica o módulo de amor-próprio (o livro é claro: se houve abuso, não volte).',
    priority: 100,
    condition: {
      answer: { questionId: 'q_seguranca', op: 'selected', optionIds: ['opt_seguranca_algumas', 'opt_seguranca_frequente'] },
    },
    effects: [
      { type: 'addFlag', flag: 'safety_support' },
      { type: 'addScore', categoryId: 'cat_amor_proprio', value: 15 },
      { type: 'recommendModule', moduleId: 'mod_amor_proprio' },
    ],
  },
  {
    id: 'rule_volta_por_vazio',
    name: 'Querer voltar por vazio ou medo da solidão',
    description: '"Primeiro, cuide de você": quem quer voltar para preencher um vazio começa pelo amor-próprio.',
    priority: 60,
    condition: { answer: { questionId: 'q_term_motivo', op: 'selected', optionIds: ['opt_motivo_vazio', 'opt_motivo_sozinha'] } },
    effects: [
      { type: 'addScore', categoryId: 'cat_amor_proprio', value: 15 },
      { type: 'recommendModule', moduleId: 'mod_amor_proprio' },
    ],
  },
  {
    id: 'rule_quase_termino',
    name: 'Ainda juntos, mas perto do fim',
    description: 'Quem sente que o término está perto é levada ao módulo de crise ("evitar o término").',
    priority: 55,
    condition: { answer: { questionId: 'q_term_quando', op: 'selected', optionIds: ['opt_quando_naoterminamos'] } },
    effects: [
      { type: 'addScore', categoryId: 'cat_crise', value: 20 },
      { type: 'recommendModule', moduleId: 'mod_crise' },
    ],
  },
  {
    id: 'rule_se_anular',
    name: 'Se anular pela relação',
    description: 'Colocar a vida dele na frente da sua ou fazer quase tudo sozinha reforça o tema amor-próprio.',
    priority: 50,
    condition: {
      any: [
        { answer: { questionId: 'q_fachada', op: 'selected', optionIds: ['opt_fachada_anular'] } },
        { answer: { questionId: 'q_comp_equilibrio', op: 'selected', optionIds: ['opt_equilibrio_eu'] } },
      ],
    },
    effects: [{ type: 'addScore', categoryId: 'cat_amor_proprio', value: 10 }],
  },
  {
    id: 'rule_traicao_repetida',
    name: 'Traição repetida',
    description: 'Quem trai repetidamente dificilmente muda: além da confiança, o foco vai para os seus limites.',
    priority: 45,
    condition: { answer: { questionId: 'q_conf_traicao', op: 'selected', optionIds: ['opt_traicao_repetida'] } },
    effects: [
      { type: 'addScore', categoryId: 'cat_amor_proprio', value: 10 },
      { type: 'recommendModule', moduleId: 'mod_amor_proprio' },
    ],
  },
  {
    id: 'rule_briga_sem_conversa',
    name: 'Toda conversa vira briga',
    description: 'Comunicação é o elemento nº 1 para evitar o término: indica também o módulo de conversas.',
    priority: 40,
    condition: {
      any: [
        { answer: { questionId: 'q_crise_problema', op: 'selected', optionIds: ['opt_problema_semconversa'] } },
        { answer: { questionId: 'q_conv_assunto', op: 'selected', optionIds: ['opt_assunto_discussao'] } },
      ],
    },
    effects: [{ type: 'recommendModule', moduleId: 'mod_conversas' }],
  },
  {
    id: 'rule_vergonha',
    name: 'Vergonha de pedir ajuda',
    description: 'Não é correr atrás de ninguém: reforça o amor-próprio e mostra a resposta a essa dúvida.',
    priority: 30,
    condition: { answer: { questionId: 'q_ajuda', op: 'selected', optionIds: ['opt_ajuda_vergonha'] } },
    effects: [
      { type: 'addScore', categoryId: 'cat_amor_proprio', value: 5 },
      { type: 'addFlag', flag: 'objecao_vergonha' },
    ],
  },
  flagWhen('rule_obj_desconfianca', 'Já se decepcionou antes', 'q_ajuda', ['opt_ajuda_decepcao'], 'objecao_desconfianca'),
  {
    id: 'rule_obj_eficacia',
    name: 'Dúvida se funciona para ela',
    description: 'Mostra no resultado a resposta à dúvida "objecao_eficacia".',
    priority: 20,
    condition: {
      any: [
        { answer: { questionId: 'q_ajuda', op: 'selected', optionIds: ['opt_ajuda_semvolta'] } },
        { answer: { questionId: 'q_para_comecar', op: 'selected', optionIds: ['opt_comecar_funciona'] } },
      ],
    },
    effects: [{ type: 'addFlag', flag: 'objecao_eficacia' }],
  },
  flagWhen('rule_obj_tempo', 'Pouco tempo no dia a dia', 'q_tempo_dia', ['opt_tempo_5'], 'objecao_tempo'),
  flagWhen('rule_obj_garantia', 'Medo de ser enganada', 'q_para_comecar', ['opt_comecar_garantia'], 'objecao_garantia'),
  flagWhen('rule_obj_preco', 'Orçamento apertado', 'q_para_comecar', ['opt_comecar_preco'], 'objecao_preco'),
  flagWhen('rule_obj_previa', 'Quer ver antes de comprar', 'q_para_comecar', ['opt_comecar_previa'], 'objecao_previa'),
  {
    id: 'rule_situacao_conquista',
    name: 'Momento: conquista',
    description: 'Garante que o módulo do momento da pessoa esteja entre as indicações.',
    priority: 5,
    condition: { answer: { questionId: 'q_momento', op: 'selected', optionIds: ['opt_momento_solteira', 'opt_momento_crush'] } },
    effects: [{ type: 'recommendModule', moduleId: 'mod_conquista' }],
  },
  {
    id: 'rule_situacao_relacao',
    name: 'Momento: relação que quer durar',
    description: 'Garante que o módulo do momento da pessoa esteja entre as indicações.',
    priority: 5,
    condition: { answer: { questionId: 'q_momento', op: 'selected', optionIds: ['opt_momento_namorando', 'opt_momento_casada'] } },
    effects: [{ type: 'recommendModule', moduleId: 'mod_compromisso' }],
  },
  {
    id: 'rule_situacao_crise',
    name: 'Momento: crise',
    description: 'Garante que o módulo do momento da pessoa esteja entre as indicações.',
    priority: 5,
    condition: { answer: { questionId: 'q_momento', op: 'selected', optionIds: ['opt_momento_crise'] } },
    effects: [{ type: 'recommendModule', moduleId: 'mod_crise' }],
  },
  {
    id: 'rule_situacao_termino',
    name: 'Momento: depois do término',
    description: 'Garante que o módulo do momento da pessoa esteja entre as indicações.',
    priority: 5,
    condition: { answer: { questionId: 'q_momento', op: 'selected', optionIds: DEPOIS_DO_FIM } },
    effects: [{ type: 'recommendModule', moduleId: 'mod_termino' }],
  },
];
