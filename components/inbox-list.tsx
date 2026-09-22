'use client';

import React, { useState } from 'react';
import { ChevronDown, ChevronRight, Mail, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import OpportunityCardView from '@/components/opportunity-card-view';
import CallSheet from '@/components/call-sheet';
import { formatUkDate } from '@/lib/opportunity-timing';
import { isNoise } from '@/lib/inbox';
import {
  OPPORTUNITY_TYPE_LABELS,
  type CallSheet as CallSheetData,
  type InboxItem,
  type Urgency,
} from '@/lib/opportunity-types';

const URGENCY_CHIP: Record<Urgency, { className: string; label: string }> = {
  critical: { className: 'bg-red-100 text-red-800 border-red-200', label: 'Decide now' },
  tight: { className: 'bg-amber-100 text-amber-800 border-amber-200', label: 'Tight' },
  comfortable: { className: 'bg-green-100 text-green-800 border-green-200', label: 'Time in hand' },
  unknown: { className: 'bg-gray-100 text-gray-700 border-gray-200', label: 'No date' },
  closed: { className: 'bg-gray-200 text-gray-600 border-gray-300', label: 'Closed' },
};

/** "Decide by Fri 30 Oct - 12 days", or why there is no such date. */
function decideByLine(item: InboxItem): string {
  const { timing } = item;
  if (timing.urgency === 'closed') return `Closed ${formatUkDate(timing.closing_date)}`;
  if (!timing.decide_by) return 'No closing date in the email';

  const days = timing.days_to_decide ?? 0;
  if (days < 0) return `Decide-by passed ${formatUkDate(timing.decide_by)} - closes ${formatUkDate(timing.closing_date)}`;
  if (days === 0) return `Decide today - closes ${formatUkDate(timing.closing_date)}`;
  return `Decide by ${formatUkDate(timing.decide_by)} - ${days} day${days === 1 ? '' : 's'}`;
}

function sourceLine(item: InboxItem): string {
  const [first] = item.sources;
  const count = item.sources.length;
  const who = first?.from?.replace(/<[^>]*>/g, '').replace(/"/g, '').trim() || 'unknown sender';
  const when = first?.received_at ? formatUkDate(first.received_at) : null;

  const parts = [count > 1 ? `${count} emails` : '1 email', who];
  if (when) parts.push(when);
  return parts.join(' - ');
}

interface InboxRowProps {
  item: InboxItem;
  hasRegister: boolean;
  callSheet: CallSheetData | null;
  matching: boolean;
  onMatch: (item: InboxItem) => void;
  onCopy: (item: InboxItem) => void;
  copied: boolean;
}

function InboxRow({ item, hasRegister, callSheet, matching, onMatch, onCopy, copied }: InboxRowProps) {
  const [open, setOpen] = useState(false);
  const chip = URGENCY_CHIP[item.timing.urgency];
  const noise = isNoise(item);

  return (
    <div className={`rounded-lg border ${noise ? 'border-gray-200 bg-gray-50' : 'border-gray-200 bg-white'}`}>
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="flex w-full items-start gap-3 p-4 text-left hover:bg-gray-50"
      >
        {open ? (
          <ChevronDown className="mt-1 h-4 w-4 flex-shrink-0 text-gray-400" />
        ) : (
          <ChevronRight className="mt-1 h-4 w-4 flex-shrink-0 text-gray-400" />
        )}

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-semibold text-gray-900">
              {item.opportunity.name ?? item.sources[0]?.subject ?? 'Untitled'}
            </span>
            {noise ? (
              <span className="rounded-full bg-gray-200 px-2 py-0.5 text-xs text-gray-600">
                {OPPORTUNITY_TYPE_LABELS[item.opportunity.type]}
              </span>
            ) : (
              <span className={`rounded-full border px-2 py-0.5 text-xs font-semibold ${chip.className}`}>
                {chip.label}
              </span>
            )}
          </div>

          {item.opportunity.funder && <p className="mt-0.5 text-sm text-gray-600">{item.opportunity.funder}</p>}

          {!noise && <p className="mt-1 text-sm font-medium text-gray-700">{decideByLine(item)}</p>}

          <p className="mt-1 flex items-center gap-1 text-xs text-gray-400">
            <Mail className="h-3 w-3" />
            {sourceLine(item)}
          </p>
        </div>
      </button>

      {open && (
        <div className="space-y-4 border-t border-gray-200 p-4">
          <OpportunityCardView
            opportunity={item.opportunity}
            timing={item.timing}
            warnings={item.warnings}
          />

          {item.opportunity.actionable && (
            <>
              <Button onClick={() => onMatch(item)} disabled={!hasRegister || matching} className="gap-2">
                {matching ? (
                  <>
                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                    Matching clients...
                  </>
                ) : (
                  <>
                    <Search className="h-4 w-4" />
                    Find clients to contact
                  </>
                )}
              </Button>
              {!hasRegister && <p className="text-sm text-gray-500">Load a client register to match against.</p>}
            </>
          )}

          {callSheet && <CallSheet callSheet={callSheet} onCopy={() => onCopy(item)} copied={copied} />}
        </div>
      )}
    </div>
  );
}

interface InboxListProps {
  items: InboxItem[];
  hasRegister: boolean;
  callSheets: Record<string, CallSheetData>;
  matchingId: string | null;
  copiedId: string | null;
  onMatch: (item: InboxItem) => void;
  onCopy: (item: InboxItem) => void;
}

export default function InboxList({
  items,
  hasRegister,
  callSheets,
  matchingId,
  copiedId,
  onMatch,
  onCopy,
}: InboxListProps) {
  const [showNoise, setShowNoise] = useState(false);

  const live = items.filter((item) => !isNoise(item));
  const noise = items.filter(isNoise);

  const row = (item: InboxItem) => (
    <InboxRow
      key={item.id}
      item={item}
      hasRegister={hasRegister}
      callSheet={callSheets[item.id] ?? null}
      matching={matchingId === item.id}
      onMatch={onMatch}
      onCopy={onCopy}
      copied={copiedId === item.id}
    />
  );

  return (
    <div className="space-y-3">
      {live.map(row)}

      {noise.length > 0 && (
        <div className="pt-2">
          <button
            type="button"
            onClick={() => setShowNoise((value) => !value)}
            className="inline-flex items-center gap-1 text-sm font-medium text-gray-600 hover:text-gray-900"
          >
            {showNoise ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
            Not opportunities ({noise.length})
          </button>
          {showNoise && <div className="mt-3 space-y-3">{noise.map(row)}</div>}
        </div>
      )}
    </div>
  );
}
