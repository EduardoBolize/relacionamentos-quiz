/**
 * Formatos de dados trocados entre o servidor e o navegador. Nunca incluem pesos das opções,
 * regras de pontuação ou dados de outras pessoas — o motor de pontuação roda apenas no servidor.
 */

export interface StepOptionDTO {
  id: string;
  label: string;
}

export interface PriceModuleDTO {
  slug: string;
  title: string;
  subtitle: string;
  description: string;
  priceCents: number;
  coverEmoji: string;
  highlights: string[];
}

export interface StepDTO {
  id: string;
  kind: 'question' | 'price';
  stage: { id: string; title: string; description: string; index: number; count: number };
  text: string;
  helpText: string | null;
  type: 'single' | 'multiple' | 'scale';
  required: boolean;
  maxSelections: number | null;
  scaleMinLabel: string | null;
  scaleMaxLabel: string | null;
  options: StepOptionDTO[];
  module: PriceModuleDTO | null;
  /** Resposta atual (quando a pessoa volta a uma pergunta já respondida). */
  selected: string[];
  isFirst: boolean;
}

export interface ProgressDTO {
  percent: number;
  stageIndex: number;
  stageCount: number;
  answeredSteps: number;
  totalSteps: number;
}

export type QuizStateDTO =
  | { status: 'in_progress'; step: StepDTO; progress: ProgressDTO }
  | { status: 'completed'; resultPath: string; progress: ProgressDTO };

/** Resposta do GET da sessão: inclui o caso "nenhum teste em andamento". */
export type QuizSessionLookupDTO = QuizStateDTO | { status: 'none' };

export interface ThemeDTO {
  categoryId: string;
  name: string;
  color: string;
  score: number;
  shortDescription: string;
  explanation: string;
}

export type RecommendationReasonDTO = 'primary' | 'secondary' | 'rule' | 'price_agreed' | 'explore';

export interface ResultModuleDTO {
  id: string;
  slug: string;
  title: string;
  subtitle: string;
  description: string;
  previewContent: string;
  priceCents: number;
  coverEmoji: string;
  reason: RecommendationReasonDTO;
  categoryName: string | null;
  priceAgreement: 'agree' | 'maybe' | 'disagree' | null;
  preselected: boolean;
  videoCount: number;
  /** Destino do botão de compra (checkout do site ou externo, ex.: Kiwify). */
  buyHref: string;
  buyExternal: boolean;
}

export interface ResultViewDTO {
  completedAt: string;
  primary: ThemeDTO | null;
  secondary: ThemeDTO[];
  scores: ThemeDTO[];
  modules: ResultModuleDTO[];
  flags: string[];
  hasEmail: boolean;
  /** `owner`: quem fez o teste; `viewer`: link de compartilhamento (somente leitura). */
  access: 'owner' | 'viewer';
}

export interface CatalogModuleDTO {
  id: string;
  slug: string;
  title: string;
  subtitle: string;
  description: string;
  priceCents: number;
  coverEmoji: string;
}

export interface QuoteDTO {
  items: { slug: string; title: string; priceCents: number }[];
  subtotalCents: number;
  discountCents: number;
  discountPercent: number;
  totalCents: number;
  installmentOptions: { count: number; amountCents: number }[];
}

export type OrderStatusDTO = 'pending' | 'paid' | 'failed' | 'expired' | 'canceled' | 'refunded';

export interface OrderViewDTO {
  status: OrderStatusDTO;
  method: 'pix' | 'boleto' | 'card';
  customerFirstName: string;
  createdAt: string;
  paidAt: string | null;
  expiresAt: string | null;
  subtotalCents: number;
  discountCents: number;
  totalCents: number;
  installments: number;
  failureReason: string | null;
  items: { slug: string; title: string; priceCents: number; coverEmoji: string }[];
  pix: { copyPasteCode: string; qrCodeDataUrl: string; expiresAt: string } | null;
  boleto: { digitableLine: string; barcode: string; dueDate: string } | null;
  card: { brand: string; last4: string; installments: number; authorizationCode?: string } | null;
  simulatorEnabled: boolean;
}

export interface ApiErrorBody {
  error: { code: string; message: string; details?: Record<string, string[] | undefined> };
}
