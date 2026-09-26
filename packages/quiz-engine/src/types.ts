/**
 * Tipos do domínio do quiz.
 *
 * O motor é propositalmente independente de framework e de banco de dados:
 * recebe uma `QuizDefinition` (montada a partir do banco pelo pacote `@relacionamentos/db`)
 * e as respostas da pessoa, e devolve fluxo, progresso e resultado.
 */

export type QuestionType = 'single' | 'multiple' | 'scale';

export interface CategoryDef {
  id: string;
  slug: string;
  name: string;
  /** Frase curta exibida na lista de pontuações. */
  shortDescription: string;
  /** Texto cuidadoso (não diagnóstico) exibido quando o tema se destaca. */
  explanation: string;
  color: string;
  position: number;
}

export interface OptionDef {
  id: string;
  label: string;
  /** Pontos que esta opção soma em cada categoria: `categoryId → peso` (pode ser negativo). */
  weights: Record<string, number>;
}

export interface QuestionDef {
  id: string;
  stageId: string;
  text: string;
  helpText?: string | null;
  type: QuestionType;
  /** Perguntas opcionais podem ser puladas (resposta vazia). */
  required: boolean;
  /** Limite de seleções para perguntas `multiple` (vazio = sem limite). */
  maxSelections?: number | null;
  /** Rótulos das extremidades para perguntas do tipo `scale` (ex.: "Nada" / "Totalmente"). */
  scaleMinLabel?: string | null;
  scaleMaxLabel?: string | null;
  /** Condição de exibição (quiz adaptativo). Vazia = sempre exibida. */
  condition?: Condition | null;
  options: OptionDef[];
}

export interface StageOffer {
  /** Módulo (seção do livro) relacionado à etapa. */
  moduleId: string;
  /** Exibe, ao final da etapa, a pergunta de concordância com o valor da seção do livro. */
  priceQuestionEnabled: boolean;
  /**
   * Relevância mínima (0–100) para exibir a pergunta de valor: a maior pontuação, até aquele
   * momento, entre as categorias do módulo. `0` = exibir sempre.
   */
  minScore: number;
}

export interface StageDef {
  id: string;
  title: string;
  description: string;
  condition?: Condition | null;
  offer?: StageOffer | null;
  /** Perguntas já ordenadas. */
  questions: QuestionDef[];
}

export interface ModuleDef {
  id: string;
  slug: string;
  title: string;
  subtitle: string;
  description: string;
  priceCents: number;
  categoryIds: string[];
  position: number;
}

export interface EngineSettings {
  /** Pontuação mínima (0–100) para um tema ser considerado principal. */
  primaryMinScore: number;
  /** Pontuação mínima (0–100) para um tema aparecer como secundário. */
  secondaryMinScore: number;
  /** Quantidade máxima de temas secundários. */
  maxSecondary: number;
}

export interface QuizDefinition {
  categories: CategoryDef[];
  /** Etapas já ordenadas. */
  stages: StageDef[];
  modules: ModuleDef[];
  rules: RuleDef[];
  settings: EngineSettings;
}

// ───────────────────────────── Condições ─────────────────────────────

export type ScoreOperator = 'gte' | 'gt' | 'lte' | 'lt';

/**
 * - `selected`: alguma das opções informadas foi escolhida;
 * - `notSelected`: a pergunta foi respondida e nenhuma das opções informadas foi escolhida;
 * - `answered` / `notAnswered`: a pergunta tem (ou não) alguma opção escolhida.
 */
export type AnswerOperator = 'selected' | 'notSelected' | 'answered' | 'notAnswered';

export interface AnswerClause {
  questionId: string;
  op: AnswerOperator;
  optionIds?: string[];
}

export interface ScoreClause {
  categoryId: string;
  op: ScoreOperator;
  /** Pontuação normalizada 0–100. */
  value: number;
}

export type Condition =
  | { all: Condition[] }
  | { any: Condition[] }
  | { not: Condition }
  | { answer: AnswerClause }
  | { score: ScoreClause };

// ───────────────────────────── Regras ─────────────────────────────

export type RuleEffect =
  | { type: 'addScore'; categoryId: string; value: number }
  | { type: 'multiplyScore'; categoryId: string; factor: number }
  | { type: 'recommendModule'; moduleId: string }
  | { type: 'addFlag'; flag: string };

export interface RuleDef {
  id: string;
  name: string;
  /** Regras de maior prioridade são aplicadas primeiro. */
  priority: number;
  condition: Condition;
  effects: RuleEffect[];
}

// ───────────────────────────── Respostas e fluxo ─────────────────────────────

/**
 * Respostas da sessão: `stepId → ids das opções escolhidas`.
 * Uma lista vazia em pergunta opcional significa "pulou".
 */
export type Answers = Record<string, string[]>;

export type PriceAgreement = 'agree' | 'maybe' | 'disagree';

export interface QuestionStep {
  kind: 'question';
  id: string;
  stageId: string;
  question: QuestionDef;
}

/** Pergunta de concordância com o valor da seção do livro, gerada ao final de cada etapa. */
export interface PriceStep {
  kind: 'price';
  id: string;
  stageId: string;
  moduleId: string;
}

export type FlowStep = QuestionStep | PriceStep;

export interface Progress {
  answeredSteps: number;
  totalSteps: number;
  /** 0–100, calculado por etapa para não "voltar" quando surgem perguntas condicionais. */
  percent: number;
  /** Índice (base 0) da etapa atual entre as etapas visíveis. */
  stageIndex: number;
  stageCount: number;
  currentStageId: string | null;
}

// ───────────────────────────── Resultado ─────────────────────────────

export interface CategoryScore {
  categoryId: string;
  /** Soma bruta dos pesos das respostas. */
  raw: number;
  /** Soma máxima possível considerando as perguntas respondidas. */
  max: number;
  /** Pontuação normalizada (0–100) antes das regras. */
  baseScore: number;
  /** Pontuação final (0–100) após as regras condicionais. */
  score: number;
}

export type RecommendationReason = 'primary' | 'secondary' | 'rule' | 'price_agreed' | 'explore';

export interface RecommendedModule {
  moduleId: string;
  reason: RecommendationReason;
  categoryId?: string;
  priceAgreement?: PriceAgreement;
  /** Sugestão de pré-seleção no checkout (a pessoa concordou com o valor, por exemplo). */
  preselected: boolean;
}

export interface QuizResult {
  engineVersion: string;
  /** Tema que mais se destacou, ou `null` quando nenhum atingiu o mínimo (perfil equilibrado). */
  primary: CategoryScore | null;
  secondary: CategoryScore[];
  /** Todas as categorias, ordenadas da maior para a menor pontuação. */
  scores: CategoryScore[];
  recommendedModules: RecommendedModule[];
  /** Concordância com o valor de cada módulo: `moduleId → resposta`. */
  priceAgreements: Record<string, PriceAgreement>;
  /** Sinalizadores adicionados por regras (ex.: `safety_support`). */
  flags: string[];
  appliedRuleIds: string[];
}
