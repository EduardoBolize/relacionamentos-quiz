import { defineConfig, globalIgnores } from 'eslint/config';
import nextVitals from 'eslint-config-next/core-web-vitals';
import nextTs from 'eslint-config-next/typescript';

export default defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    // Versão explícita: a detecção automática do eslint-plugin-react usa uma API removida no ESLint 10.
    settings: { next: { rootDir: '.' }, react: { version: '19.3' } },
  },
  {
    // Código que pode rodar no navegador nunca importa código de servidor (segredos, banco, gateway).
    // Importar apenas TIPOS é permitido (eles somem na compilação).
    files: ['src/components/**', 'src/lib/**'],
    rules: {
      '@typescript-eslint/no-restricted-imports': [
        'error',
        {
          paths: [
            {
              name: '@relacionamentos/payments',
              message: 'No navegador, use "@relacionamentos/payments/client".',
              allowTypeImports: true,
            },
            { name: '@relacionamentos/db', message: 'O banco de dados só pode ser acessado no servidor.', allowTypeImports: true },
          ],
          patterns: [
            {
              group: ['@/server/*', '@/server/**'],
              message: 'Código de servidor não pode ser importado em componentes/lib de cliente.',
              allowTypeImports: true,
            },
          ],
        },
      ],
    },
  },
  globalIgnores(['.next/**', 'out/**', 'build/**', 'next-env.d.ts', 'test-results/**', 'playwright-report/**']),
]);
