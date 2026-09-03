import { AlignmentType, Document, HeadingLevel, LevelFormat, Packer, Paragraph, TextRun } from 'docx';
import type { Block, Run, SummaryDocumentInput } from './summary-format';
import { formatGeneratedAt } from './summary-format';

const NUMBERED_REFERENCE = 'summary-numbered';

function toTextRuns(runs: Run[]): TextRun[] {
  return runs.map((run) => new TextRun({ text: run.text, bold: run.bold }));
}

/**
 * Convert blocks to Word paragraphs. Each run of consecutive numbered items
 * gets its own numbering instance so every list restarts at 1.
 */
function blocksToParagraphs(blocks: Block[], numberedInstance: { value: number }): Paragraph[] {
  const paragraphs: Paragraph[] = [];
  let inNumberedList = false;

  for (const block of blocks) {
    if (block.type !== 'numbered') inNumberedList = false;

    switch (block.type) {
      case 'heading':
        paragraphs.push(
          new Paragraph({
            heading: block.level <= 2 ? HeadingLevel.HEADING_2 : HeadingLevel.HEADING_3,
            children: toTextRuns(block.runs),
            spacing: { before: 240, after: 120 },
          })
        );
        break;
      case 'paragraph':
        paragraphs.push(new Paragraph({ children: toTextRuns(block.runs), spacing: { after: 120 } }));
        break;
      case 'bullet':
        paragraphs.push(
          new Paragraph({
            children: toTextRuns(block.runs),
            bullet: { level: Math.min(block.depth, 2) },
            spacing: { after: 60 },
          })
        );
        break;
      case 'numbered':
        if (!inNumberedList) {
          numberedInstance.value += 1;
          inNumberedList = true;
        }
        paragraphs.push(
          new Paragraph({
            children: toTextRuns(block.runs),
            numbering: { reference: NUMBERED_REFERENCE, level: Math.min(block.depth, 2), instance: numberedInstance.value },
            spacing: { after: 60 },
          })
        );
        break;
    }
  }

  return paragraphs;
}

export function summaryFileName(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  const stamp = `${date.getFullYear()}${pad(date.getMonth() + 1)}${pad(date.getDate())}_${pad(date.getHours())}${pad(date.getMinutes())}${pad(date.getSeconds())}`;
  return `Meeting_Summary_${stamp}.docx`;
}

/** Build the Word document as a Blob (runs in the browser). */
export async function buildSummaryDocx(input: SummaryDocumentInput): Promise<Blob> {
  const numberedInstance = { value: 0 };

  const children: Paragraph[] = [
    new Paragraph({ heading: HeadingLevel.TITLE, children: [new TextRun('Meeting Summary')] }),
    new Paragraph({
      children: [new TextRun({ text: `Generated: ${formatGeneratedAt(input.generatedAt)}`, italics: true, color: '666666' })],
      spacing: { after: 240 },
    }),
    new Paragraph({ heading: HeadingLevel.HEADING_1, children: [new TextRun('Main Discussion Points')], spacing: { before: 240, after: 120 } }),
    ...blocksToParagraphs(input.mainPoints, numberedInstance),
    new Paragraph({ heading: HeadingLevel.HEADING_1, children: [new TextRun('Recommendations')], spacing: { before: 360, after: 120 } }),
    ...blocksToParagraphs(input.recommendations, numberedInstance),
    new Paragraph({ heading: HeadingLevel.HEADING_1, children: [new TextRun('Services Covered')], spacing: { before: 360, after: 120 } }),
    ...input.services.map(
      (service) =>
        new Paragraph({
          children: [
            new TextRun({ text: service.selected ? '☑ ' : '☐ ' }),
            new TextRun({ text: service.label, bold: service.selected }),
          ],
          spacing: { after: 60 },
        })
    ),
  ];

  const document = new Document({
    creator: 'IGS Summariser',
    title: 'Meeting Summary',
    styles: { default: { document: { run: { font: 'Calibri', size: 22 } } } },
    numbering: {
      config: [
        {
          reference: NUMBERED_REFERENCE,
          levels: [0, 1, 2].map((level) => ({
            level,
            format: LevelFormat.DECIMAL,
            text: `%${level + 1}.`,
            alignment: AlignmentType.START,
            style: { paragraph: { indent: { left: 720 * (level + 1), hanging: 360 } } },
          })),
        },
      ],
    },
    sections: [{ children }],
  });

  return Packer.toBlob(document);
}
