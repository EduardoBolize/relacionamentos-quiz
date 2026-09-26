import { defineConfig } from 'prisma/config';
import { loadRootEnv } from './src/env';
import { resolveDatabaseUrl } from './src/paths';

// O `.env` fica na raiz do monorepo; caminhos SQLite relativos são resolvidos a partir dela.
loadRootEnv();

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    path: 'prisma/migrations',
    seed: 'tsx seed/seed.ts',
  },
  datasource: {
    url: resolveDatabaseUrl(),
  },
});
