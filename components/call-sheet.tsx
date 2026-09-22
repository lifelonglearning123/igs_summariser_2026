'use client';

import React, { useState } from 'react';
import {
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Copy,
  HelpCircle,
  MessageSquare,
  Phone,
  UserX,
  XCircle,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { formatUkDate } from '@/lib/opportunity-timing';
import {
  MATCH_VERDICT_LABELS,
  type CallSheet as CallSheetData,
  type ClientMatch,
  type GateVerdict,
  type MatchVerdict,
} from '@/lib/opportunity-types';

const VERDICT_STYLES: Record<MatchVerdict, string> = {
  strong: 'bg-green-100 text-green-800 border-green-200',
  possible: 'bg-blue-100 text-blue-800 border-blue-200',
  long_shot: 'bg-amber-100 text-amber-800 border-amber-200',
  excluded: 'bg-gray-200 text-gray-700 border-gray-300',
};

const GATE_ICONS: Record<GateVerdict, React.ReactNode> = {
  pass: <CheckCircle2 className="h-4 w-4 flex-shrink-0 text-green-600" />,
  fail: <XCircle className="h-4 w-4 flex-shrink-0 text-red-600" />,
  unknown: <HelpCircle className="h-4 w-4 flex-shrink-0 text-amber-600" />,
};

function MatchRow({ match, position }: { match: ClientMatch; position: number }) {
  const [showGates, setShowGates] = useState(false);

  const unknownGates = match.gates.filter((gate) => gate.verdict === 'unknown').length;
  const failedGates = match.gates.filter((gate) => gate.verdict === 'fail').length;

  return (
    <div className="rounded-lg border border-gray-200 p-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <h3 className="font-semibold text-gray-900">
            {position}. {match.client_name}
          </h3>
          <p className="mt-0.5 text-xs text-gray-500">
            {match.igs_owner ? `${match.igs_owner} - ` : ''}
            {match.last_contact ? `last spoke ${formatUkDate(match.last_contact)}` : 'no contact date on record'}
          </p>
        </div>
        <span className={`rounded-full border px-3 py-1 text-xs font-semibold ${VERDICT_STYLES[match.verdict]}`}>
          {MATCH_VERDICT_LABELS[match.verdict]}
        </span>
      </div>

      <p className="mt-3 text-sm text-gray-700">{match.why}</p>

      {match.evidence.length > 0 && (
        <ul className="mt-3 space-y-2">
          {match.evidence.map((item, index) => (
            <li key={index} className="border-l-2 border-gray-200 pl-3">
              <p className="text-sm italic text-gray-600">&ldquo;{item.quote}&rdquo;</p>
              {item.meeting_date && (
                <p className="mt-0.5 text-xs text-gray-400">{formatUkDate(item.meeting_date)}</p>
              )}
            </li>
          ))}
        </ul>
      )}

      {match.questions_to_ask.length > 0 && (
        <div className="mt-3">
          <h4 className="text-xs font-semibold uppercase tracking-wide text-gray-500">Ask them</h4>
          <ul className="mt-1 list-disc space-y-1 pl-5 text-sm text-gray-700">
            {match.questions_to_ask.map((question, index) => (
              <li key={index}>{question}</li>
            ))}
          </ul>
        </div>
      )}

      {match.gaps.length > 0 && (
        <div className="mt-3">
          <h4 className="text-xs font-semibold uppercase tracking-wide text-gray-500">They would need to line up</h4>
          <ul className="mt-1 list-disc space-y-1 pl-5 text-sm text-gray-700">
            {match.gaps.map((gap, index) => (
              <li key={index}>{gap}</li>
            ))}
          </ul>
        </div>
      )}

      {match.opening_line && (
        <div className="mt-3 flex items-start gap-2 rounded-md bg-blue-50 p-3">
          <MessageSquare className="mt-0.5 h-4 w-4 flex-shrink-0 text-blue-600" />
          <p className="text-sm text-blue-900">{match.opening_line}</p>
        </div>
      )}

      {match.gates.length > 0 && (
        <>
          <button
            type="button"
            onClick={() => setShowGates((open) => !open)}
            className="mt-3 inline-flex items-center gap-1 text-sm font-medium text-gray-600 hover:text-gray-900"
          >
            {showGates ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
            Eligibility: {match.gates.length - unknownGates - failedGates} met, {unknownGates} unknown
            {failedGates > 0 ? `, ${failedGates} failed` : ''}
          </button>

          {showGates && (
            <ul className="mt-2 space-y-2 border-t border-gray-100 pt-2">
              {match.gates.map((gate, index) => (
                <li key={`${gate.gate_id}-${index}`} className="flex items-start gap-2 text-sm">
                  {GATE_ICONS[gate.verdict]}
                  <div>
                    <p className="text-gray-900">{gate.requirement}</p>
                    <p className="text-gray-500">{gate.note}</p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </div>
  );
}

interface CallSheetProps {
  callSheet: CallSheetData;
  onCopy: () => void;
  copied: boolean;
}

export default function CallSheet({ callSheet, onCopy, copied }: CallSheetProps) {
  const [showExcluded, setShowExcluded] = useState(false);
  const { matches, excluded, shortlisted, register_size: registerSize, warnings } = callSheet;

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Phone className="h-5 w-5" />
              Who to contact
            </CardTitle>
            <CardDescription>
              {matches.length} of {shortlisted} shortlisted, from a register of {registerSize}.
            </CardDescription>
          </div>
          {matches.length > 0 && (
            <Button variant="outline" size="sm" onClick={onCopy} className="gap-2">
              {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              {copied ? 'Copied' : 'Copy call sheet'}
            </Button>
          )}
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {warnings.length > 0 && (
          <div className="rounded-lg border border-amber-200 bg-amber-50 p-3">
            <ul className="space-y-1 text-sm text-amber-900">
              {warnings.map((warning, index) => (
                <li key={index}>{warning}</li>
              ))}
            </ul>
          </div>
        )}

        {matches.length === 0 ? (
          <p className="text-sm text-gray-600">
            No client in the register is worth a call on this one. The list below shows what was ruled out and why.
          </p>
        ) : (
          <div className="space-y-3">
            {matches.map((match, index) => (
              <MatchRow key={match.client_id} match={match} position={index + 1} />
            ))}
          </div>
        )}

        {excluded.length > 0 && (
          <div className="border-t border-gray-200 pt-4">
            <button
              type="button"
              onClick={() => setShowExcluded((open) => !open)}
              className="inline-flex items-center gap-1 text-sm font-medium text-gray-600 hover:text-gray-900"
            >
              {showExcluded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
              <UserX className="h-4 w-4" />
              Not contacting ({excluded.length})
            </button>

            {showExcluded && (
              <ul className="mt-2 space-y-1.5">
                {excluded.map((entry) => (
                  <li key={entry.client_id} className="text-sm">
                    <span className="font-medium text-gray-700">{entry.client_name}</span>
                    <span className="text-gray-500"> - {entry.reason}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
