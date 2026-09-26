import { Fragment, type ReactNode } from 'react';
import { parseMarkdown, type Inline } from '@/lib/markdown';

function renderInline(nodes: Inline[]): ReactNode {
  return nodes.map((node, index) => {
    if (node.type === 'text') return <Fragment key={index}>{node.value}</Fragment>;
    if (node.type === 'strong') return <strong key={index}>{renderInline(node.children)}</strong>;
    return <em key={index}>{renderInline(node.children)}</em>;
  });
}

/**
 * Renderiza o subconjunto seguro de markdown como elementos React.
 * Nunca usa `dangerouslySetInnerHTML`: todo texto é escapado pelo React.
 */
export function SafeMarkdown({ source, className = 'prose-content' }: { source: string; className?: string }) {
  const blocks = parseMarkdown(source);
  return (
    <div className={className}>
      {blocks.map((block, index) => {
        switch (block.type) {
          case 'heading':
            return block.level === 2 ? <h2 key={index}>{renderInline(block.children)}</h2> : <h3 key={index}>{renderInline(block.children)}</h3>;
          case 'list':
            return (
              <ul key={index}>
                {block.items.map((item, itemIndex) => (
                  <li key={itemIndex}>{renderInline(item)}</li>
                ))}
              </ul>
            );
          case 'quote':
            return <blockquote key={index}>{renderInline(block.children)}</blockquote>;
          default:
            return <p key={index}>{renderInline(block.children)}</p>;
        }
      })}
    </div>
  );
}
