import 'server-only';
import { loadQuizDefinition, type DefinitionLoadIssue } from '@relacionamentos/db';
import { QuizEngine, type QuizDefinition } from '@relacionamentos/quiz-engine';
import { db } from './db';

/**
 * Cache da definição do quiz. É invalidado a cada alteração feita no painel admin; o TTL curto
 * garante que outras instâncias do servidor também vejam as mudanças rapidamente.
 */
const TTL_MS = 30_000;

interface CacheEntry {
  definition: QuizDefinition;
  issues: DefinitionLoadIssue[];
  loadedAt: number;
}

const globalCache = globalThis as unknown as { __rqDefinition?: CacheEntry | null };

export async function getQuizDefinition(): Promise<{ definition: QuizDefinition; issues: DefinitionLoadIssue[] }> {
  const cached = globalCache.__rqDefinition;
  if (cached && Date.now() - cached.loadedAt < TTL_MS) return cached;
  const loaded = await loadQuizDefinition(db());
  globalCache.__rqDefinition = { ...loaded, loadedAt: Date.now() };
  return loaded;
}

export async function getEngine(): Promise<QuizEngine> {
  const { definition } = await getQuizDefinition();
  return new QuizEngine(definition);
}

export function invalidateQuizDefinition(): void {
  globalCache.__rqDefinition = null;
}
