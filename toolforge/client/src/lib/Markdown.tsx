// lib/Markdown.tsx — tiny dependency-free markdown renderer.
// Supports: ATX headings (#..######), bold (**x**), italic (*x*/_x_),
// inline code (`x`), fenced code (```), unordered/ordered lists,
// blockquotes, horizontal rules, GitHub-style tables, and paragraphs.
import React from 'react';

let keySeq = 0;
const nextKey = () => `md-${keySeq++}`;

/* --------------------------- inline rendering --------------------------- */
// Order matters: code spans first so we don't format inside them.
function renderInline(text: string): React.ReactNode[] {
  const out: React.ReactNode[] = [];
  // Split on inline code first to protect it.
  const codeParts = text.split(/(`[^`]+`)/g);
  for (const part of codeParts) {
    if (part.startsWith('`') && part.endsWith('`') && part.length >= 2) {
      out.push(
        <code
          key={nextKey()}
          className="rounded bg-ink-950/80 px-1.5 py-0.5 font-mono text-[0.82em] text-forge-400 ring-1 ring-ink-700"
        >
          {part.slice(1, -1)}
        </code>,
      );
    } else {
      out.push(...renderEmphasis(part));
    }
  }
  return out;
}

function renderEmphasis(text: string): React.ReactNode[] {
  const out: React.ReactNode[] = [];
  // Bold then italic. Tokenize with a combined regex.
  const re = /(\*\*[^*]+\*\*|__[^_]+__|\*[^*]+\*|_[^_]+_|\[[^\]]+\]\([^)]+\))/g;
  let last = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) {
    if (m.index > last) out.push(text.slice(last, m.index));
    const tok = m[0];
    if (tok.startsWith('**') || tok.startsWith('__')) {
      out.push(
        <strong key={nextKey()} className="font-semibold text-slate-100">
          {tok.slice(2, -2)}
        </strong>,
      );
    } else if (tok.startsWith('[')) {
      const linkMatch = /\[([^\]]+)\]\(([^)]+)\)/.exec(tok);
      if (linkMatch) {
        out.push(
          <a
            key={nextKey()}
            href={linkMatch[2]}
            target="_blank"
            rel="noreferrer"
            className="text-forge-400 underline decoration-dotted underline-offset-2 hover:text-forge-500"
          >
            {linkMatch[1]}
          </a>,
        );
      } else {
        out.push(tok);
      }
    } else {
      out.push(
        <em key={nextKey()} className="italic text-slate-200">
          {tok.slice(1, -1)}
        </em>,
      );
    }
    last = m.index + tok.length;
  }
  if (last < text.length) out.push(text.slice(last));
  return out;
}

/* --------------------------- block parsing --------------------------- */
function splitTableRow(line: string): string[] {
  return line
    .trim()
    .replace(/^\|/, '')
    .replace(/\|$/, '')
    .split('|')
    .map((c) => c.trim());
}

function isTableSeparator(line: string): boolean {
  return /^\s*\|?[\s:-]*-[\s:|-]*\|?\s*$/.test(line) && line.includes('-');
}

export function Markdown({ source }: { source: string }): React.ReactElement {
  keySeq = 0;
  const lines = source.replace(/\r\n/g, '\n').split('\n');
  const blocks: React.ReactNode[] = [];
  let i = 0;

  const flushParagraph = (buf: string[]) => {
    if (buf.length === 0) return;
    blocks.push(
      <p key={nextKey()} className="my-2 leading-relaxed text-slate-300">
        {renderInline(buf.join(' '))}
      </p>,
    );
  };

  while (i < lines.length) {
    const line = lines[i];

    // Fenced code block
    const fence = /^```(\w+)?\s*$/.exec(line);
    if (fence) {
      const lang = fence[1] || '';
      const code: string[] = [];
      i++;
      while (i < lines.length && !/^```\s*$/.test(lines[i])) {
        code.push(lines[i]);
        i++;
      }
      i++; // skip closing fence
      blocks.push(
        <pre
          key={nextKey()}
          className="my-3 overflow-x-auto rounded-lg border border-ink-700 bg-ink-950/80 p-3 font-mono text-xs leading-relaxed text-slate-200"
        >
          {lang && (
            <div className="mb-1 select-none text-[10px] uppercase tracking-wider text-slate-500">
              {lang}
            </div>
          )}
          <code>{code.join('\n')}</code>
        </pre>,
      );
      continue;
    }

    // Horizontal rule
    if (/^\s*([-*_])\1{2,}\s*$/.test(line)) {
      blocks.push(<hr key={nextKey()} className="my-4 border-ink-700" />);
      i++;
      continue;
    }

    // Headings
    const h = /^(#{1,6})\s+(.*)$/.exec(line);
    if (h) {
      const level = h[1].length;
      const content = renderInline(h[2]);
      const sizes = [
        'text-2xl font-bold text-slate-50 mt-4 mb-2',
        'text-xl font-bold text-slate-50 mt-4 mb-2',
        'text-lg font-semibold text-slate-100 mt-3 mb-1.5',
        'text-base font-semibold text-slate-100 mt-3 mb-1.5',
        'text-sm font-semibold text-slate-200 mt-2 mb-1',
        'text-xs font-semibold uppercase tracking-wide text-slate-400 mt-2 mb-1',
      ];
      const cls = sizes[level - 1];
      blocks.push(
        React.createElement(
          `h${level}`,
          { key: nextKey(), className: cls },
          content,
        ),
      );
      i++;
      continue;
    }

    // Blockquote
    if (/^>\s?/.test(line)) {
      const quote: string[] = [];
      while (i < lines.length && /^>\s?/.test(lines[i])) {
        quote.push(lines[i].replace(/^>\s?/, ''));
        i++;
      }
      blocks.push(
        <blockquote
          key={nextKey()}
          className="my-3 border-l-2 border-forge-600/60 bg-ink-800/40 py-1.5 pl-3 pr-2 text-slate-300"
        >
          {renderInline(quote.join(' '))}
        </blockquote>,
      );
      continue;
    }

    // Table (header row + separator)
    if (
      line.includes('|') &&
      i + 1 < lines.length &&
      isTableSeparator(lines[i + 1])
    ) {
      const header = splitTableRow(line);
      i += 2;
      const rows: string[][] = [];
      while (i < lines.length && lines[i].includes('|') && lines[i].trim()) {
        rows.push(splitTableRow(lines[i]));
        i++;
      }
      blocks.push(
        <div key={nextKey()} className="my-3 overflow-x-auto">
          <table className="w-full border-collapse text-left text-sm">
            <thead>
              <tr>
                {header.map((c) => (
                  <th
                    key={nextKey()}
                    className="border-b border-ink-600 px-3 py-2 font-semibold text-slate-200"
                  >
                    {renderInline(c)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={nextKey()} className="odd:bg-ink-800/30">
                  {r.map((c) => (
                    <td
                      key={nextKey()}
                      className="border-b border-ink-700/60 px-3 py-1.5 text-slate-300"
                    >
                      {renderInline(c)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>,
      );
      continue;
    }

    // Unordered list
    if (/^\s*[-*+]\s+/.test(line)) {
      const items: React.ReactNode[] = [];
      while (i < lines.length && /^\s*[-*+]\s+/.test(lines[i])) {
        items.push(
          <li key={nextKey()} className="my-1 text-slate-300">
            {renderInline(lines[i].replace(/^\s*[-*+]\s+/, ''))}
          </li>,
        );
        i++;
      }
      blocks.push(
        <ul
          key={nextKey()}
          className="my-2 list-disc space-y-0.5 pl-6 marker:text-forge-500"
        >
          {items}
        </ul>,
      );
      continue;
    }

    // Ordered list
    if (/^\s*\d+\.\s+/.test(line)) {
      const items: React.ReactNode[] = [];
      while (i < lines.length && /^\s*\d+\.\s+/.test(lines[i])) {
        items.push(
          <li key={nextKey()} className="my-1 text-slate-300">
            {renderInline(lines[i].replace(/^\s*\d+\.\s+/, ''))}
          </li>,
        );
        i++;
      }
      blocks.push(
        <ol
          key={nextKey()}
          className="my-2 list-decimal space-y-0.5 pl-6 marker:text-slate-500"
        >
          {items}
        </ol>,
      );
      continue;
    }

    // Blank line
    if (line.trim() === '') {
      i++;
      continue;
    }

    // Paragraph: accumulate consecutive non-empty, non-special lines.
    const para: string[] = [];
    while (
      i < lines.length &&
      lines[i].trim() !== '' &&
      !/^(#{1,6})\s+/.test(lines[i]) &&
      !/^```/.test(lines[i]) &&
      !/^\s*[-*+]\s+/.test(lines[i]) &&
      !/^\s*\d+\.\s+/.test(lines[i]) &&
      !/^>\s?/.test(lines[i]) &&
      !/^\s*([-*_])\1{2,}\s*$/.test(lines[i]) &&
      !(
        lines[i].includes('|') &&
        i + 1 < lines.length &&
        isTableSeparator(lines[i + 1])
      )
    ) {
      para.push(lines[i]);
      i++;
    }
    flushParagraph(para);
  }

  return <div className="text-sm">{blocks}</div>;
}
