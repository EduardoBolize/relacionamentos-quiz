/**
 * Exporta o curso para a pasta `curso-kiwify/`, separado do jeito que a Kiwify (ou qualquer área de
 * membros) organiza o conteúdo: um diretório por módulo, um arquivo por aula, o texto completo em
 * Markdown/HTML (e PDF, opcional), uma planilha com a estrutura e os textos da oferta.
 *
 * Lê o conteúdo ATUAL do banco — inclusive as edições feitas no admin. O guia escrito à mão
 * (`COMO-SUBIR-NA-KIWIFY.md`) não é apagado.
 *
 * Uso:
 *   npm run curso:exportar                → textos, roteiros, HTML, planilha e PDFs (os PDFs usam o
 *                                           Microsoft Edge ou o Chrome instalado; sem navegador, são pulados)
 *   npm run curso:exportar -- --sem-pdf   → sem os PDFs
 */
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { createPrismaClient, findRepoRoot, resolveDatabaseUrl } from '@relacionamentos/db';
import { calculateQuote, formatBRL } from '@relacionamentos/payments';
import { config } from 'dotenv';
import { parseMarkdown, type Inline } from '../src/lib/markdown';

const root = findRepoRoot();
for (const file of ['.env.local', '.env']) {
  const envPath = path.join(root, file);
  if (existsSync(envPath)) config({ path: envPath, override: false, quiet: true });
}

const OUT = path.join(root, 'curso-kiwify');
const withPdf = !process.argv.includes('--sem-pdf');
const prisma = createPrismaClient(resolveDatabaseUrl(process.env.DATABASE_URL, root));

// ───────────────────────────── utilidades ─────────────────────────────

function slugify(text: string): string {
  return text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 60);
}

const pad = (n: number) => String(n).padStart(2, '0');

function duration(seconds: number): string {
  const minutes = Math.floor(seconds / 60);
  const rest = seconds % 60;
  return minutes ? `${minutes}min${rest ? ` ${pad(rest)}s` : ''}` : `${rest}s`;
}

function escapeHtml(text: string): string {
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function inlineHtml(nodes: Inline[]): string {
  return nodes
    .map((node) => {
      if (node.type === 'text') return escapeHtml(node.value);
      const inner = inlineHtml(node.children);
      return node.type === 'strong' ? `<strong>${inner}</strong>` : `<em>${inner}</em>`;
    })
    .join('');
}

/** Mesmo subconjunto de Markdown do site (sem HTML bruto), convertido para HTML escapado. */
function markdownToHtml(source: string): string {
  return parseMarkdown(source)
    .map((block) => {
      switch (block.type) {
        case 'heading':
          return `<h${block.level}>${inlineHtml(block.children)}</h${block.level}>`;
        case 'list': {
          const tag = block.ordered ? 'ol' : 'ul';
          return `<${tag}>${block.items.map((item) => `<li>${inlineHtml(item)}</li>`).join('')}</${tag}>`;
        }
        case 'quote':
          return `<blockquote>${inlineHtml(block.children)}</blockquote>`;
        default:
          return `<p>${inlineHtml(block.children)}</p>`;
      }
    })
    .join('\n');
}

function htmlDocument(title: string, subtitle: string, body: string): string {
  return `<!doctype html>
<html lang="pt-BR">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escapeHtml(title)}</title>
<style>
  @page { size: A4; margin: 18mm 16mm; }
  body { font-family: "Segoe UI", Roboto, Arial, sans-serif; color: #1e1b2e; line-height: 1.6; max-width: 760px; margin: 0 auto; padding: 24px; }
  header { border-bottom: 3px solid #e0457b; margin-bottom: 24px; padding-bottom: 12px; }
  header p { margin: 0; color: #b0255a; font-weight: 600; font-size: 14px; text-transform: uppercase; letter-spacing: .04em; }
  h1 { font-size: 30px; margin: 6px 0 0; color: #150626; }
  h2 { font-size: 21px; margin: 28px 0 8px; color: #150626; }
  h3 { font-size: 17px; margin: 20px 0 6px; color: #3b2159; }
  blockquote { margin: 16px 0; padding: 10px 16px; border-left: 4px solid #f49dbf; background: #fdf2f6; font-style: italic; }
  li { margin: 4px 0; }
  footer { margin-top: 40px; font-size: 12px; color: #6b6480; border-top: 1px solid #e5e1ec; padding-top: 10px; }
</style>
</head>
<body>
<header><p>${escapeHtml(subtitle)}</p><h1>${escapeHtml(title)}</h1></header>
${body}
<footer>Fórmula do Amor · material de apoio do módulo</footer>
</body>
</html>
`;
}

function csvCell(value: string | number): string {
  const text = String(value);
  return /[;"\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

function findBrowser(): string | null {
  const candidates = [
    process.env.PDF_BROWSER,
    'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
    'C:/Program Files/Microsoft/Edge/Application/msedge.exe',
    'C:/Program Files/Google/Chrome/Application/chrome.exe',
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    '/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge',
    '/usr/bin/google-chrome',
    '/usr/bin/chromium',
    '/usr/bin/microsoft-edge',
  ];
  return candidates.find((candidate): candidate is string => Boolean(candidate && existsSync(candidate))) ?? null;
}

/** Imprime o HTML em PDF com o navegador em modo headless (perfil temporário, sem shell). */
function printPdf(browser: string, htmlFile: string, pdfFile: string): void {
  const profile = mkdtempSync(path.join(os.tmpdir(), 'formula-pdf-'));
  try {
    execFileSync(
      browser,
      [
        '--headless=new',
        '--disable-gpu',
        '--no-first-run',
        '--no-default-browser-check',
        `--user-data-dir=${profile}`,
        '--no-pdf-header-footer',
        `--print-to-pdf=${pdfFile}`,
        pathToFileURL(htmlFile).href,
      ],
      { stdio: 'ignore', timeout: 60_000 },
    );
  } finally {
    rmSync(profile, { recursive: true, force: true });
  }
}

// ───────────────────────────── exportação ─────────────────────────────

async function main() {
  const [modules, settingRows] = await Promise.all([
    prisma.bookModule.findMany({
      where: { active: true },
      orderBy: [{ position: 'asc' }, { title: 'asc' }],
      include: { videos: { where: { active: true }, orderBy: [{ position: 'asc' }, { createdAt: 'asc' }] } },
    }),
    prisma.setting.findMany({ where: { key: { in: ['pricing', 'course', 'objections'] } } }),
  ]);
  if (!modules.length) throw new Error('Nenhum módulo ativo no banco. Rode `npm run db:seed` antes.');

  const setting = <T>(key: string, fallback: T): T => {
    const row = settingRows.find((entry) => entry.key === key);
    try {
      return row ? (JSON.parse(row.value) as T) : fallback;
    } catch {
      return fallback;
    }
  };
  const pricing = setting('pricing', { comboDiscountPercent: 0, comboMinItems: 2, maxInstallments: 6, minInstallmentCents: 1000 });
  const course = setting('course', { guaranteeDays: 7, fullCourseCheckoutUrl: null as string | null });
  const objections = setting<{ flag: string; title: string; answer: string }[]>('objections', []);
  const quote = calculateQuote(
    modules.map((module) => ({ id: module.id, title: module.title, priceCents: module.priceCents })),
    pricing,
  );
  const lastInstallment = quote.installmentOptions[quote.installmentOptions.length - 1]!;
  const values: Record<string, string> = {
    preco_modulo: formatBRL(Math.min(...modules.map((module) => module.priceCents))),
    preco_curso: formatBRL(quote.totalCents),
    parcelas: String(lastInstallment.count),
    modulos: String(modules.length),
    garantia_dias: String(course.guaranteeDays),
  };
  const fill = (text: string) => text.replace(/\{([a-z_]+)\}/g, (match, key: string) => values[key] ?? match);

  // Limpa só o que é gerado (o guia escrito à mão fica).
  for (const generated of ['modulos', 'LEIA-ME.md', 'oferta-e-pagina-de-vendas.md', 'estrutura.csv', 'aulas.json']) {
    rmSync(path.join(OUT, generated), { recursive: true, force: true });
  }
  mkdirSync(path.join(OUT, 'modulos'), { recursive: true });

  const browser = withPdf ? findBrowser() : null;
  if (withPdf && !browser) console.warn('! Navegador não encontrado: os PDFs não serão gerados (instale o Edge/Chrome ou defina PDF_BROWSER).');

  const csv: string[] = [['Módulo', 'Título do módulo', 'Conteúdo', 'Título da aula', 'Tipo', 'Duração', 'Arquivo'].map(csvCell).join(';')];
  const tree: string[] = [];
  /** Lista das aulas para o gerador de vídeos-rascunho (`npm run curso:videos`). */
  const manifest: Record<string, unknown>[] = [];
  let lessonCount = 0;

  for (const [moduleIndex, module] of modules.entries()) {
    const number = moduleIndex + 1;
    const dirName = `${pad(number)}-${module.slug}`;
    const dir = path.join(OUT, 'modulos', dirName);
    mkdirSync(dir, { recursive: true });
    tree.push(`- **Módulo ${number} — ${module.title}** (\`modulos/${dirName}/\`)`);

    const lessonList = module.videos.map((video, i) => `${i + 1}. ${video.title} (${duration(video.durationSeconds)}, vídeo)`);
    lessonList.push(`${module.videos.length + 1}. Texto do módulo (leitura + PDF de apoio)`);
    writeFileSync(
      path.join(dir, '00-sobre-o-modulo.md'),
      `# Módulo ${number} — ${module.title}

**Subtítulo:** ${module.subtitle}
**Preço avulso:** ${formatBRL(module.priceCents)}

## Descrição (para o módulo na Kiwify)
${module.description}

## Aulas
${lessonList.join('\n')}

## Prévia / o que a aluna vai aprender
${module.previewContent}
`,
    );

    for (const [videoIndex, video] of module.videos.entries()) {
      lessonCount += 1;
      const file = `aula-${pad(videoIndex + 1)}-${slugify(video.title)}.md`;
      const words = video.script.split(/\s+/).filter(Boolean).length;
      writeFileSync(
        path.join(dir, file),
        `# Aula ${videoIndex + 1} — ${video.title}

- **Módulo:** ${number} · ${module.title}
- **Formato:** vídeo de ~${duration(video.durationSeconds)} (${words} palavras de narração)
- **Aula grátis na página do site:** ${video.isPreview ? 'sim' : 'não'}
- **Vídeo publicado no site:** ${video.videoUrl ?? 'ainda não (cole o link em Admin → Módulos)'}

## Descrição da aula (cole no campo "Descrição" da Kiwify)
${video.keyPoints
  .split('\n')
  .filter(Boolean)
  .map((point) => `- ${point}`)
  .join('\n')}

## Roteiro de narração (leia em voz alta, com calma)
${video.script}

## Texto na tela (um por cena)
${video.keyPoints
  .split('\n')
  .filter(Boolean)
  .map((point, i) => `${i + 1}. ${point}`)
  .join('\n')}

## Dicas de gravação
- Grave na horizontal (16:9), com luz de frente e o celular na altura dos olhos.
- Fale olhando para a câmera, como numa conversa com uma amiga.
- Ritmo de ~150 palavras por minuto: este roteiro dá cerca de ${Math.max(1, Math.round((words / 150) * 60))} segundos.
- Exporte em MP4 (1080p) e nomeie o arquivo como \`${dirName}-${file.replace(/\.md$/, '.mp4')}\`.
`,
      );
      csv.push(
        [number, module.title, videoIndex + 1, video.title, 'Vídeo', duration(video.durationSeconds), `modulos/${dirName}/${file}`].map(csvCell).join(';'),
      );
      manifest.push({
        modulo: number,
        moduloTitulo: module.title,
        pasta: dirName,
        aula: videoIndex + 1,
        titulo: video.title,
        roteiro: video.script,
        destaques: video.keyPoints
          .split('\n')
          .map((line) => line.trim())
          .filter(Boolean),
        arquivoVideo: `${dirName}-${file.replace(/\.md$/, '.mp4')}`,
      });
    }

    const textName = `aula-${pad(module.videos.length + 1)}-texto-do-modulo`;
    writeFileSync(path.join(dir, `${textName}.md`), `# ${module.title}\n\n_${module.subtitle}_\n\n${module.content}\n`);
    const htmlFile = path.join(dir, 'texto-do-modulo.html');
    writeFileSync(htmlFile, htmlDocument(module.title, `Módulo ${number} · ${module.subtitle.split('·').pop()?.trim() ?? ''}`, markdownToHtml(module.content)));
    if (browser) {
      printPdf(browser, htmlFile, path.join(dir, `formula-do-amor-modulo-${pad(number)}.pdf`));
    }
    csv.push(
      [number, module.title, module.videos.length + 1, 'Texto do módulo', 'Texto + PDF', '—', `modulos/${dirName}/${textName}.md`].map(csvCell).join(';'),
    );
  }

  const discount = quote.discountCents > 0 ? ` (valor cheio ${formatBRL(quote.subtotalCents)}, ${quote.discountPercent}% de desconto)` : '';
  writeFileSync(
    path.join(OUT, 'oferta-e-pagina-de-vendas.md'),
    `# Oferta e textos de venda — Fórmula do Amor

## Produto
- **Nome:** Fórmula do Amor
- **Descrição curta:** O método de conquista que vai mudar sua realidade amorosa, em ${modules.length} módulos curtos com aulas em vídeo de ~1 minuto e textos práticos.
- **Tipo:** pagamento único · entrega pela Área de membros da Kiwify
- **Garantia:** ${course.guaranteeDays} dias

## Preços (ofertas)
| Oferta | Preço | Libera |
|---|---|---|
| Curso completo | ${formatBRL(quote.totalCents)}${discount} — parcelável em até ${lastInstallment.count}x no cartão | todos os módulos |
${modules.map((module, i) => `| Módulo ${i + 1} — ${module.title} | ${formatBRL(module.priceCents)} | só o módulo ${i + 1} |`).join('\n')}

## Descrição longa (página do produto)
Descubra o caminho certo para a sua vida amorosa, seja para conquistar, manter ou reconquistar um amor. O Fórmula do Amor começa por você: primeiro, você cuida de si mesma, porque estar bem emocionalmente é essencial. Depois, aprende a se conectar de forma natural, com comunicação e atitudes que despertam um interesse genuíno, sem joguinhos e sem forçar nada.

São ${modules.length} módulos curtos, cada um com 3 aulas em vídeo de cerca de 1 minuto e um texto direto ao ponto, com exercícios para praticar no mesmo dia:
${modules.map((module, i) => `${i + 1}. **${module.title}:** ${module.description}`).join('\n')}

Não é fórmula mágica nem promessa milagrosa: é um conjunto de estratégias que você adapta à sua realidade, no seu ritmo. E você tem ${course.guaranteeDays} dias de garantia.

## Perguntas frequentes (respostas às objeções)
${objections.map((objection) => `### ${objection.title}\n${fill(objection.answer)}`).join('\n\n')}
`,
  );

  writeFileSync(path.join(OUT, 'estrutura.csv'), `\uFEFF${csv.join('\r\n')}\r\n`);
  writeFileSync(path.join(OUT, 'aulas.json'), `${JSON.stringify({ marca: 'F\u00F3rmula do Amor', aulas: manifest }, null, 2)}\n`);

  writeFileSync(
    path.join(OUT, 'LEIA-ME.md'),
    `# Material do curso Fórmula do Amor

Gerado em ${new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' })} a partir do conteúdo atual do site
(\`npm run curso:exportar\`). Para subir na Kiwify, siga o [passo a passo](COMO-SUBIR-NA-KIWIFY.md).

- **${modules.length} módulos**, **${lessonCount} aulas em vídeo** (~1 minuto cada) e ${modules.length} textos completos
- Curso completo: **${formatBRL(quote.totalCents)}** · módulo avulso: **${values.preco_modulo}**
- [Oferta e textos de venda](oferta-e-pagina-de-vendas.md) · [Planilha da estrutura](estrutura.csv)

## Pastas
${tree.join('\n')}

Em cada pasta de módulo:
- \`00-sobre-o-modulo.md\` — título, descrição e lista de aulas (para criar o módulo)
- \`aula-01…03-*.md\` — roteiro de cada vídeo, texto na tela e descrição da aula
- \`aula-04-texto-do-modulo.md\` — texto completo (para a aula de leitura)
- \`texto-do-modulo.html\` — o mesmo texto formatado (abra no navegador para copiar ou imprimir)
${browser ? '- `formula-do-amor-modulo-NN.pdf` — material de apoio para anexar na aula\n' : '- (PDFs não gerados: instale o Microsoft Edge ou o Chrome e rode a exportação de novo)\n'}
## Vídeos-rascunho (opcional, Windows)
\`npm run curso:videos\` cria em \`videos-rascunho/\` um MP4 por aula (slides com os destaques + narração
sintética em pt-BR) e os slides em PNG. Servem para montar e testar o curso antes da gravação definitiva
com voz humana. Essa pasta fica só no seu computador (é pesada demais para o GitHub).
`,
  );

  console.log(`✓ Curso exportado para ${path.relative(root, OUT)}/: ${modules.length} módulos, ${lessonCount} aulas${browser ? ' e PDFs' : ''}.`);
}

try {
  await main();
} catch (error) {
  console.error('Falha ao exportar o curso:', error);
  process.exitCode = 1;
} finally {
  await prisma.$disconnect();
}
