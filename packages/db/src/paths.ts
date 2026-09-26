import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';

/**
 * Localiza a raiz do monorepo (o `package.json` que declara `workspaces`), subindo a partir de
 * `start`. Assim o mesmo `DATABASE_URL` relativo funciona para o app web, scripts e testes,
 * independentemente da pasta em que cada processo é iniciado.
 */
export function findRepoRoot(start: string = process.cwd()): string {
  let dir = path.resolve(start);
  for (;;) {
    const manifest = path.join(dir, 'package.json');
    if (existsSync(manifest)) {
      try {
        if (JSON.parse(readFileSync(manifest, 'utf8')).workspaces) return dir;
      } catch {
        // package.json inválido: continua subindo
      }
    }
    const parent = path.dirname(dir);
    if (parent === dir) return path.resolve(start);
    dir = parent;
  }
}

export const DEFAULT_DATABASE_URL = 'file:./data/app.db';

/**
 * Para SQLite, converte caminhos relativos (`file:./data/app.db`) em absolutos a partir da raiz
 * do monorepo. URLs de outros bancos (ex.: `postgresql://…`) são devolvidas sem alteração.
 */
export function resolveDatabaseUrl(
  url: string = process.env.DATABASE_URL || DEFAULT_DATABASE_URL,
  root: string = findRepoRoot(),
): string {
  if (!url.startsWith('file:')) return url;
  const filePath = url.slice('file:'.length);
  if (filePath === ':memory:') return url;
  const absolute = path.isAbsolute(filePath) ? filePath : path.resolve(root, filePath);
  return `file:${absolute.split(path.sep).join('/')}`;
}
