'use client';

import React, { useState } from 'react';
import { AlertCircle, CalendarDays, ChevronDown, ChevronRight, Clock, Info } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formatUkDate, timingHeadline } from '@/lib/opportunity-timing';
import { labelForKey } from '@/lib/taxonomy';
import {
  OPPORTUNITY_TYPE_LABELS,
  type OpportunityCard,
  type OpportunityTiming,
  type Urgency,
} from '@/lib/opportunity-types';

const URGENCY_STYLES: Record<Urgency, { box: string; label: string }> = {
  critical: { box: 'border-red-300 bg-red-50 text-red-900', label: 'Act now' },
  tight: { box: 'border-amber-300 bg-amber-50 text-amber-900', label: 'Tight' },
  comfortable: { box: 'border-green-300 bg-green-50 text-green-900', label: 'Time in hand' },
  closed: { box: 'border-gray-300 bg-gray-100 text-gray-700', label: 'Closed' },
  unknown: { box: 'border-gray-300 bg-gray-50 text-gray-700', label: 'No date' },
};

function money(value: number | null): string | null {
  if (value === null) return null;
  if (value >= 1_000_000) return `£${(value / 1_000_000).toFixed(value % 1_000_000 === 0 ? 0 : 1)}m`;
  if (value >= 1_000) return `£${Math.round(value / 1_000)}k`;
  return `£${value}`;
}

function Fact({ label, value }: { label: string; value: string | null }) {
  if (!value) return null;
  return (
    <div>
      <dt className="text-xs uppercase tracking-wide text-gray-500">{label}</dt>
      <dd className="text-sm font-medium text-gray-900">{value}</dd>
    </div>
  );
}

/**
 * The decide-by banner. The closing date is what the email shouts about; this
 * is the date that actually decides whether a call is worth making, so it gets
 * the top of the page and shows its working on request.
 */
function TimingBanner({ timing }: { timing: OpportunityTiming }) {
  const [showWorking, setShowWorking] = useState(false);
  const style = URGENCY_STYLES[timing.urgency];

  return (
    <div className={`rounded-lg border p-4 ${style.box}`}>
      <div className="flex items-start gap-3">
        <Clock className="mt-0.5 h-5 w-5 flex-shrink-0" />
        <div className="min-w-0 flex-1">
          <p className="font-semibold">{timingHeadline(timing)}</p>

          {timing.upcoming_support.length > 0 && (
            <ul className="mt-2 space-y-1 text-sm">
              {timing.upcoming_support.map((support, index) => (
                <li key={index} className="flex items-start gap-2">
                  <CalendarDays className="mt-0.5 h-4 w-4 flex-shrink-0 opacity-70" />
                  <span>
                    {support.label}
                    {support.date ? ` - ${formatUkDate(support.date)}` : ''}
                    {support.note ? ` (${support.note})` : ''}
                  </span>
                </li>
              ))}
            </ul>
          )}

          <button
            type="button"
            onClick={() => setShowWorking((open) => !open)}
            className="mt-2 inline-flex items-center gap-1 text-sm font-medium underline-offset-2 hover:underline"
          >
            {showWorking ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
            How the {timing.lead_time_days}-day lead time was worked out
          </button>

          {showWorking && (
            <ul className="mt-2 list-disc space-y-1 pl-5 text-sm opacity-90">
              {timing.reasoning.map((line, index) => (
                <li key={index}>{line}</li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}

interface OpportunityCardViewProps {
  opportunity: OpportunityCard;
  timing: OpportunityTiming;
  warnings: string[];
}

export default function OpportunityCardView({ opportunity, timing, warnings }: OpportunityCardViewProps) {
  const grant =
    opportunity.grant_min || opportunity.grant_max
      ? [money(opportunity.grant_min), money(opportunity.grant_max)].filter(Boolean).join(' to ')
      : null;

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div className="min-w-0">
            <CardTitle className="text-lg">{opportunity.name ?? 'Unnamed opportunity'}</CardTitle>
            {opportunity.funder && <p className="mt-1 text-sm text-gray-600">{opportunity.funder}</p>}
          </div>
          <span
            className={`rounded-full px-3 py-1 text-xs font-semibold ${
              opportunity.actionable ? 'bg-blue-100 text-blue-800' : 'bg-gray-200 text-gray-700'
            }`}
          >
            {OPPORTUNITY_TYPE_LABELS[opportunity.type]}
          </span>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        <p className="text-sm text-gray-700">{opportunity.summary}</p>

        <TimingBanner timing={timing} />

        <dl className="grid grid-cols-2 gap-4 sm:grid-cols-3">
          <Fact label="Grant size" value={grant} />
          <Fact label="Total pot" value={money(opportunity.total_pot)} />
          <Fact label="Closes" value={opportunity.closing_date ? formatUkDate(opportunity.closing_date) : null} />
          <Fact label="Project start" value={opportunity.project_start ? formatUkDate(opportunity.project_start) : null} />
          <Fact label="Duration" value={opportunity.project_window} />
          <Fact
            label="Application"
            value={
              opportunity.scored_questions
                ? `${opportunity.scored_questions} questions${opportunity.word_limit ? ` x ${opportunity.word_limit} words` : ''}`
                : null
            }
          />
        </dl>

        {opportunity.themes.length > 0 && (
          <div>
            <h3 className="mb-2 text-sm font-semibold text-gray-900">Themes</h3>
            <ul className="space-y-1.5">
              {opportunity.themes.map((theme, index) => (
                <li key={index} className="text-sm">
                  <span className="font-medium text-gray-900">{theme.name}</span>
                  {theme.sub_themes.length > 0 && (
                    <span className="text-gray-600"> - {theme.sub_themes.join(' / ')}</span>
                  )}
                </li>
              ))}
            </ul>
          </div>
        )}

        {opportunity.hard_gates.length > 0 && (
          <div>
            <h3 className="mb-2 text-sm font-semibold text-gray-900">
              Eligibility gates ({opportunity.hard_gates.length})
            </h3>
            <ul className="space-y-1.5">
              {opportunity.hard_gates.map((gate) => (
                <li key={gate.id} className="flex items-start gap-2 text-sm text-gray-700">
                  <span
                    className={`mt-0.5 rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase ${
                      gate.severity === 'hard' ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-600'
                    }`}
                  >
                    {gate.severity}
                  </span>
                  <span>{gate.requirement}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {opportunity.soft_signals.length > 0 && (
          <div>
            <h3 className="mb-2 text-sm font-semibold text-gray-900">The bid must also argue</h3>
            <ul className="list-disc space-y-1 pl-5 text-sm text-gray-700">
              {opportunity.soft_signals.map((signal, index) => (
                <li key={index}>{signal}</li>
              ))}
            </ul>
          </div>
        )}

        {(opportunity.sectors.length > 0 || opportunity.tech_tags.length > 0) && (
          <div className="flex flex-wrap gap-1.5">
            {[...opportunity.sectors, ...opportunity.tech_tags].map((key) => (
              <span key={key} className="rounded-full bg-gray-100 px-2.5 py-0.5 text-xs text-gray-700">
                {labelForKey(key)}
              </span>
            ))}
          </div>
        )}

        {opportunity.url && (
          <a
            href={opportunity.url}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1 text-sm font-medium text-blue-600 hover:text-blue-700"
          >
            <Info className="h-4 w-4" />
            Competition details
          </a>
        )}

        {warnings.length > 0 && (
          <div className="rounded-lg border border-amber-200 bg-amber-50 p-3">
            <ul className="space-y-1">
              {warnings.map((warning, index) => (
                <li key={index} className="flex items-start gap-2 text-sm text-amber-900">
                  <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0" />
                  <span>{warning}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
