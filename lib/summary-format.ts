/**
 * Turns the model's markdown-ish output into a small block structure that the
 * dashboard, the clipboard copy and the Word export all render from, so the
 * three stay consistent.
 */

export interface Run {
  text: string;
  bold: boolean;
}

export type Block =
  | { type: 'heading'; level: 1 | 2 | 3; runs: Run[] }
  | { type: 'paragraph'; runs: Run[] }
  | { type: 'bullet'; depth: number; runs: Run[] }
  | { type: 'numbered'; depth: number; number: number; runs: Run[] };

const SEPARATOR_LINE = /^[+\-*_=]+$/;
const HEADING_LINE = /^(#{1,6})\s+(.+?)\s*#*$/;
const BULLET_LINE = /^[-*•+]\s+(.*)$/;
const NUMBERED_LINE = /^(\d{1,3})[.)]\s+(.*)$/;
const FULLY_BOLD_LINE = /^\*\*([^*]+?)\*\*:?$/;
const LABEL_PREFIX = /^([A-Za-z][^:*]{0,40}?):\s+(\S.*)$/;

function clampLevel(n: number): 1 | 2 | 3 {
  return n <= 1 ? 1 : n === 2 ? 2 : 3;
}

function depthFromIndent(indent: number): number {
  return indent >= 6 ? 2 : indent >= 2 ? 1 : 0;
}

/** Remove single-character emphasis markers (*text* / _text_) but keep the text. */
function stripEmphasis(text: string): string {
  return text.replace(/(^|\s)[*_]([^*_\s][^*_]*?)[*_](?=\s|[.,;:!?)]|$)/g, '$1$2');
}

/** Split inline text into bold / plain runs. */
export function parseRuns(text: string): Run[] {
  const cleaned = text.replace(/`([^`]*)`/g, '$1');
  const runs: Run[] = [];
  const pattern = /\*\*(.+?)\*\*|__(.+?)__/g;
  let last = 0;
  let match: RegExpExecArray | null;

  while ((match = pattern.exec(cleaned))) {
    if (match.index > last) {
      runs.push({ text: stripEmphasis(cleaned.slice(last, match.index)), bold: false });
    }
    runs.push({ text: stripEmphasis(match[1] ?? match[2] ?? ''), bold: true });
    last = match.index + match[0].length;
  }
  if (last < cleaned.length) {
    runs.push({ text: stripEmphasis(cleaned.slice(last)), bold: false });
  }

  // "Title: value" with no explicit bold: bold the label so it reads like the rest.
  if (runs.length === 1 && !runs[0].bold) {
    const label = LABEL_PREFIX.exec(runs[0].text);
    if (label && !/[.!?]/.test(label[1])) {
      return [
        { text: `${label[1]}:`, bold: true },
        { text: ` ${label[2]}`, bold: false },
      ];
    }
  }

  return runs.filter((run) => run.text.length > 0);
}

function looksLikeHeading(text: string): boolean {
  if (FULLY_BOLD_LINE.test(text)) return true;
  if (text.length > 60 || !text.endsWith(':')) return false;
  const body = text.slice(0, -1);
  return !/[.!?]/.test(body) && !/:\s/.test(body);
}

/** Parse the model output into blocks. Every non-empty line becomes its own block. */
export function parseSummaryMarkdown(markdown: string): Block[] {
  const blocks: Block[] = [];
  const lines = (markdown || '').replace(/\r\n?/g, '\n').split('\n');

  for (const rawLine of lines) {
    const line = rawLine.replace(/\t/g, '    ');
    const trimmed = line.trim();
    if (!trimmed || SEPARATOR_LINE.test(trimmed)) continue;

    const depth = depthFromIndent(line.length - line.trimStart().length);
    let match: RegExpExecArray | null;

    if ((match = HEADING_LINE.exec(trimmed))) {
      blocks.push({ type: 'heading', level: clampLevel(match[1].length), runs: parseRuns(match[2]) });
    } else if ((match = BULLET_LINE.exec(trimmed))) {
      blocks.push({ type: 'bullet', depth, runs: parseRuns(match[1]) });
    } else if ((match = NUMBERED_LINE.exec(trimmed))) {
      blocks.push({ type: 'numbered', depth, number: parseInt(match[1], 10), runs: parseRuns(match[2]) });
    } else if (looksLikeHeading(trimmed)) {
      const bold = FULLY_BOLD_LINE.exec(trimmed);
      const headingText = bold ? `${bold[1]}${trimmed.endsWith(':') && !bold[1].endsWith(':') ? ':' : ''}` : trimmed;
      blocks.push({ type: 'heading', level: 3, runs: [{ text: headingText, bold: false }] });
    } else {
      blocks.push({ type: 'paragraph', runs: parseRuns(trimmed) });
    }
  }

  return blocks;
}

export function runsToText(runs: Run[]): string {
  return runs.map((run) => run.text).join('');
}

/* ------------------------------------------------------------------ */
/* Whole-document rendering (plain text and HTML)                      */
/* ------------------------------------------------------------------ */

export interface SummaryWriteUp {
  label: string;
  blocks: Block[];
}

export interface SummaryDocumentInput {
  generatedAt: Date;
  mainPoints: Block[];
  recommendations: Block[];
  services: { label: string; selected: boolean }[];
  /** Salesforce write-ups the coach generated, in service order. */
  writeUps: SummaryWriteUp[];
}

export function formatGeneratedAt(date: Date): string {
  return date.toLocaleString('en-GB', { dateStyle: 'long', timeStyle: 'short' });
}

export function blocksToPlainText(blocks: Block[]): string {
  const lines: string[] = [];
  blocks.forEach((block, index) => {
    const text = runsToText(block.runs);
    switch (block.type) {
      case 'heading':
        if (index > 0) lines.push('');
        lines.push(text);
        break;
      case 'paragraph':
        lines.push(text);
        break;
      case 'bullet':
        lines.push(`${'  '.repeat(block.depth)}• ${text}`);
        break;
      case 'numbered':
        lines.push(`${'  '.repeat(block.depth)}${block.number}. ${text}`);
        break;
    }
  });
  return lines.join('\n');
}

export function summaryToPlainText(input: SummaryDocumentInput): string {
  const services = input.services.map((s) => `${s.selected ? '[x]' : '[ ]'} ${s.label}`).join('\n');
  const sections = [
    'MEETING SUMMARY',
    `Generated: ${formatGeneratedAt(input.generatedAt)}`,
    '',
    'MAIN DISCUSSION POINTS',
    blocksToPlainText(input.mainPoints),
    '',
    'RECOMMENDATIONS',
    blocksToPlainText(input.recommendations),
    '',
    'SERVICES COVERED',
    services,
  ];

  for (const writeUp of input.writeUps) {
    sections.push('', `${writeUp.label.toUpperCase()} WRITE-UP`, blocksToPlainText(writeUp.blocks));
  }

  return sections.join('\n');
}

function escapeHtml(text: string): string {
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function runsToHtml(runs: Run[]): string {
  return runs.map((run) => (run.bold ? `<strong>${escapeHtml(run.text)}</strong>` : escapeHtml(run.text))).join('');
}

export function blocksToHtml(blocks: Block[]): string {
  const out: string[] = [];
  let openList: 'ul' | 'ol' | null = null;
  const closeList = () => {
    if (openList) {
      out.push(`</${openList}>`);
      openList = null;
    }
  };

  for (const block of blocks) {
    if (block.type === 'bullet' || block.type === 'numbered') {
      const tag = block.type === 'bullet' ? 'ul' : 'ol';
      if (openList !== tag) {
        closeList();
        out.push(block.type === 'numbered' ? `<ol start="${block.number}">` : '<ul>');
        openList = tag;
      }
      const indent = block.depth ? ` style="margin-left:${block.depth * 1.25}em"` : '';
      out.push(`<li${indent}>${runsToHtml(block.runs)}</li>`);
      continue;
    }
    closeList();
    if (block.type === 'heading') {
      out.push(`<h4>${runsToHtml(block.runs)}</h4>`);
    } else {
      out.push(`<p>${runsToHtml(block.runs)}</p>`);
    }
  }
  closeList();
  return out.join('');
}

export function summaryToHtml(input: SummaryDocumentInput): string {
  const services = input.services
    .map((s) => `<li>${s.selected ? '&#9745;' : '&#9744;'} ${escapeHtml(s.label)}</li>`)
    .join('');
  return [
    '<div style="font-family:Calibri,Arial,sans-serif;font-size:11pt;line-height:1.4">',
    '<h2>Meeting Summary</h2>',
    `<p><em>Generated: ${escapeHtml(formatGeneratedAt(input.generatedAt))}</em></p>`,
    '<h3>Main Discussion Points</h3>',
    blocksToHtml(input.mainPoints),
    '<h3>Recommendations</h3>',
    blocksToHtml(input.recommendations),
    '<h3>Services Covered</h3>',
    `<ul>${services}</ul>`,
    ...input.writeUps.flatMap((writeUp) => [
      `<h3>${escapeHtml(writeUp.label)} Write-up</h3>`,
      blocksToHtml(writeUp.blocks),
    ]),
    '</div>',
  ].join('');
}

/** The text a coach pastes into a Salesforce field: the write-up body alone. */
export function writeUpToPlainText(blocks: Block[]): string {
  return blocksToPlainText(blocks);
}

export function writeUpToHtml(blocks: Block[]): string {
  return `<div style="font-family:Calibri,Arial,sans-serif;font-size:11pt;line-height:1.4">${blocksToHtml(blocks)}</div>`;
}
