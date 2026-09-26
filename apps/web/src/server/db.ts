import 'server-only';
import { getPrisma, type PrismaClient } from '@relacionamentos/db';

/** Acesso ao banco: sempre via esta função (instância única por processo). */
export function db(): PrismaClient {
  return getPrisma();
}
