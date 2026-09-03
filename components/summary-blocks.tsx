import React from 'react';
import type { Block, Run } from '@/lib/summary-format';

type Group =
  | { kind: 'list'; listType: 'bullet' | 'numbered'; items: Extract<Block, { type: 'bullet' | 'numbered' }>[] }
  | { kind: 'single'; block: Extract<Block, { type: 'heading' | 'paragraph' }> };

function groupBlocks(blocks: Block[]): Group[] {
  const groups: Group[] = [];
  for (const block of blocks) {
    if (block.type === 'bullet' || block.type === 'numbered') {
      const last = groups[groups.length - 1];
      if (last && last.kind === 'list' && last.listType === block.type) {
        last.items.push(block);
      } else {
        groups.push({ kind: 'list', listType: block.type, items: [block] });
      }
    } else {
      groups.push({ kind: 'single', block });
    }
  }
  return groups;
}

function Runs({ runs }: { runs: Run[] }) {
  return (
    <>
      {runs.map((run, index) =>
        run.bold ? (
          <strong key={index} className="font-semibold text-gray-900">
            {run.text}
          </strong>
        ) : (
          <React.Fragment key={index}>{run.text}</React.Fragment>
        )
      )}
    </>
  );
}

/**
 * Renders parsed summary blocks: headings, paragraphs, bullet and numbered lists.
 */
export default function SummaryBlocks({ blocks }: { blocks: Block[] }) {
  if (blocks.length === 0) {
    return <p className="text-sm italic text-gray-500">No content was returned for this section.</p>;
  }

  return (
    <div className="space-y-2 text-sm leading-6 text-gray-700">
      {groupBlocks(blocks).map((group, index) => {
        if (group.kind === 'list') {
          const ListTag = group.listType === 'bullet' ? 'ul' : 'ol';
          const first = group.items[0];
          return (
            <ListTag
              key={index}
              start={first.type === 'numbered' ? first.number : undefined}
              className={`${group.listType === 'bullet' ? 'list-disc' : 'list-decimal'} space-y-1.5 pl-5 marker:text-gray-400`}
            >
              {group.items.map((item, itemIndex) => (
                <li key={itemIndex} style={item.depth ? { marginLeft: `${item.depth * 1.25}rem` } : undefined}>
                  <Runs runs={item.runs} />
                </li>
              ))}
            </ListTag>
          );
        }

        const { block } = group;
        if (block.type === 'heading') {
          return (
            <h4 key={index} className="pt-3 text-[15px] font-semibold text-gray-900 first:pt-0">
              <Runs runs={block.runs} />
            </h4>
          );
        }
        return (
          <p key={index}>
            <Runs runs={block.runs} />
          </p>
        );
      })}
    </div>
  );
}
