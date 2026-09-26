export { createPrismaClient, getPrisma } from './client';
export * from './generated/prisma/client';
export { findRepoRoot, resolveDatabaseUrl, DEFAULT_DATABASE_URL } from './paths';
// `loadRootEnv` (./env) é usado só pelos scripts de linha de comando; fica fora desta entrada para
// não ser empacotado no app web.
export {
  ENGINE_SETTINGS_KEY,
  loadEngineSettings,
  loadQuizDefinition,
  type DefinitionLoadIssue,
} from './quiz-definition';
export {
  checkPasswordStrength,
  createAdminUser,
  hashPassword,
  normalizeEmail,
  verifyPassword,
} from './admin-users';
