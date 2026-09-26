/**
 * Markdown SEGURO (subconjunto) para os textos editados no admin.
 *
 * Suporta: `## título`, `### subtítulo`, parágrafos, listas (`- item`), citações (`> texto`),
 * **negrito** e *itálico*. Não há HTML bruto nem links — o resultado vira elementos React com
 * texto escapado, então um conteúdo malicioso não consegue injetar scripts (XSS).
 */

export type Inline =
  | { type: 'text'; value: string }
  | { type: 'strong'; children: Inline[] }
  | { type: 'em'; children: Inline[] };

export type Block =
  | { type: 'heading'; level: 2 | 3; children: Inline[] }
  | { type: 'paragraph'; children: Inline[] }
  | { type: 'list'; items: Inline[][] }
  | { type: 'quote'; children: Inline[] };

const MAX_SOURCE_LENGTH = 100_000;

export function parseInline(text: string): Inline[] {
  const result: Inline[] = [];
  const pattern = /\*\*([^*]+)\*\*|\*([^*\s][^*]*)\*/g;
  let last = 0;
  for (const match of text.matchAll(pattern)) {
    const index = match.index ?? 0;
    if (index > last) result.push({ type: 'text', value: text.slice(last, index) });
    if (match[1] !== undefined) result.push({ type: 'strong', children: [{ type: 'text', value: match[1] }] });
    else if (match[2] !== undefined) result.push({ type: 'em', children: [{ type: 'text', value: match[2] }] });
    last = index + match[0].length;
  }
  if (last < text.length) result.push({ type: 'text', value: text.slice(last) });
  return result;
}

export function parseMarkdown(source: string): Block[] {
  const lines = source.slice(0, MAX_SOURCE_LENGTH).replace(/\r\n?/g, '\n').split('\n');
  const blocks: Block[] = [];
  let paragraph: string[] = [];
  let list: Inline[][] = [];
  let quote: string[] = [];

  const flushParagraph = () => {
    if (paragraph.length) blocks.push({ type: 'paragraph', children: parseInline(paragraph.join(' ')) });
    paragraph = [];
  };
  const flushList = () => {
    if (list.length) blocks.push({ type: 'list', items: list });
    list = [];
  };
  const flushQuote = () => {
    if (quote.length) blocks.push({ type: 'quote', children: parseInline(quote.join(' ')) });
    quote = [];
  };
  const flushAll = () => {
    flushParagraph();
    flushList();
    flushQuote();
  };

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line) {
      flushAll();
      continue;
    }
    const heading = /^(#{1,3})\s+(.+)$/.exec(line);
    if (heading) {
      flushAll();
      blocks.push({ type: 'heading', level: heading[1]!.length === 3 ? 3 : 2, children: parseInline(heading[2]!) });
      continue;
    }
    const item = /^[-*]\s+(.+)$/.exec(line);
    if (item) {
      flushParagraph();
      flushQuote();
      list.push(parseInline(item[1]!));
      continue;
    }
    const quoted = /^>\s?(.*)$/.exec(line);
    if (quoted) {
      flushParagraph();
      flushList();
      if (quoted[1]) quote.push(quoted[1]);
      continue;
    }
    flushList();
    flushQuote();
    paragraph.push(line);
  }
  flushAll();
  return blocks;
}

export function inlineToText(inline: Inline[]): string {
  return inline.map((node) => (node.type === 'text' ? node.value : inlineToText(node.children))).join('');
}

/** Primeiros itens de lista do texto (usados como "destaques" de um módulo). */
export function extractHighlights(source: string, max: number): string[] {
  const list = parseMarkdown(source).find((block) => block.type === 'list');
  return list && list.type === 'list' ? list.items.slice(0, max).map(inlineToText) : [];
}
