import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AlertCircle, Check, ChevronDown, ChevronRight, ClipboardCheck, ListChecks, Sparkles } from 'lucide-react';
import { SERVICES, ServiceDefinition, ServiceKey } from '@/lib/services';
import type {
  ServiceAssessment,
  ServiceAssessments,
  ServiceRelevance,
  ServiceWriteUpState,
  ServiceWriteUps,
} from '@/lib/summary-types';

interface SalesforceSupportsProps {
  /** The AI's view of each support; null when classification failed. */
  assessments: ServiceAssessments | null;
  selected: ServiceKey[];
  onToggle: (service: ServiceKey) => void;
  writeUps: ServiceWriteUps;
  onGenerateWriteUp: (service: ServiceKey) => void;
  onGenerateAll: () => void;
}

/**
 * Groups are fixed by the AI's verdict, not by the checkboxes, so a support
 * never moves while the coach is ticking it.
 */
const GROUPS: { relevance: ServiceRelevance; title: string; hint: string; empty?: string }[] = [
  {
    relevance: 'discussed',
    title: 'Suggested to record',
    hint: "Covered in this meeting, so they're ticked. Untick any you won't record.",
    empty: 'Nothing on the list was clearly covered in this meeting.',
  },
  {
    relevance: 'mentioned',
    title: 'Mentioned in passing',
    hint: 'These came up briefly. Tick one if you gave enough support to record it.',
  },
  {
    relevance: 'not_discussed',
    title: 'Not discussed',
    hint: 'Tick one if you covered it and the transcript missed it.',
  },
];

function plural(count: number, word: string): string {
  return `${count} ${word}${count === 1 ? '' : 's'}`;
}

export default function SalesforceSupports({
  assessments,
  selected,
  onToggle,
  writeUps,
  onGenerateWriteUp,
  onGenerateAll,
}: SalesforceSupportsProps) {
  const [showNotDiscussed, setShowNotDiscussed] = useState(false);

  const statusOf = (key: ServiceKey) => writeUps[key]?.status;
  const toWriteUp = selected.filter((key) => statusOf(key) !== 'ready' && statusOf(key) !== 'loading');
  const writingUp = selected.filter((key) => statusOf(key) === 'loading');
  const writtenUp = selected.filter((key) => statusOf(key) === 'ready');

  const renderRow = (service: ServiceDefinition, detailed: boolean) => (
    <SupportRow
      key={service.key}
      service={service}
      assessment={detailed ? assessments?.[service.key] : undefined}
      selected={selected.includes(service.key)}
      onToggle={() => onToggle(service.key)}
      writeUp={writeUps[service.key]}
      onGenerateWriteUp={() => onGenerateWriteUp(service.key)}
    />
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ListChecks className="h-5 w-5 text-indigo-600" />
          Salesforce supports
        </CardTitle>
        <CardDescription>
          {assessments
            ? `The AI checked this meeting against all ${SERVICES.length} supports on the Salesforce list. Tick the ones to record, then write each one up.`
            : "Suggestions aren't available for this transcript. Tick the supports this meeting covered, then write each one up."}
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-6">
        {assessments ? (
          GROUPS.map((group) => {
            const services = SERVICES.filter((service) => assessments[service.key].relevance === group.relevance);
            if (services.length === 0 && !group.empty) return null;

            const headingId = `supports-${group.relevance}`;
            const collapsible = group.relevance === 'not_discussed';
            // Once ticked, a support stays in view even when its group is folded away.
            const visible = collapsible && !showNotDiscussed ? services.filter((s) => selected.includes(s.key)) : services;

            return (
              <section key={group.relevance} aria-labelledby={headingId} className="space-y-2">
                <div>
                  {collapsible ? (
                    <button
                      type="button"
                      onClick={() => setShowNotDiscussed((value) => !value)}
                      aria-expanded={showNotDiscussed}
                      className="flex items-center gap-1.5 text-sm font-semibold text-gray-900 hover:text-indigo-700"
                    >
                      {showNotDiscussed ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                      <span id={headingId}>
                        {group.title} <span className="font-normal text-gray-500">({services.length})</span>
                      </span>
                    </button>
                  ) : (
                    <h3 id={headingId} className="text-sm font-semibold text-gray-900">
                      {group.title} <span className="font-normal text-gray-500">({services.length})</span>
                    </h3>
                  )}
                  <p className="mt-0.5 text-xs text-gray-500">{services.length === 0 ? group.empty : group.hint}</p>
                </div>

                {visible.length > 0 && (
                  <ul className="space-y-2">{visible.map((service) => renderRow(service, !collapsible))}</ul>
                )}
              </section>
            );
          })
        ) : (
          <ul className="space-y-2">{SERVICES.map((service) => renderRow(service, false))}</ul>
        )}

        <div
          className="flex flex-col gap-3 border-t border-gray-200 pt-4 sm:flex-row sm:items-center sm:justify-between"
          aria-live="polite"
        >
          <p className="text-sm text-gray-600">
            {selected.length === 0
              ? 'Nothing ticked yet.'
              : `${plural(selected.length, 'support')} ticked` +
                (writtenUp.length ? `, ${writtenUp.length} written up` : '') +
                (writingUp.length ? `, ${writingUp.length} in progress` : '') +
                '.'}
          </p>
          {toWriteUp.length > 0 && (
            <Button onClick={onGenerateAll} size="sm" className="gap-1.5 bg-indigo-600 hover:bg-indigo-700 focus:ring-indigo-500">
              <ClipboardCheck className="h-4 w-4" />
              {toWriteUp.length === selected.length
                ? `Write up ${toWriteUp.length === 1 ? 'the ticked support' : `all ${toWriteUp.length} ticked`}`
                : `Write up the other ${toWriteUp.length}`}
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

interface SupportRowProps {
  service: ServiceDefinition;
  /** Present only where the AI's reasoning is worth showing. */
  assessment?: ServiceAssessment;
  selected: boolean;
  onToggle: () => void;
  writeUp?: ServiceWriteUpState;
  onGenerateWriteUp: () => void;
}

function SupportRow({ service, assessment, selected, onToggle, writeUp, onGenerateWriteUp }: SupportRowProps) {
  const inputId = `support-${service.key}`;

  return (
    <li
      className={`rounded-lg border p-3 transition-colors ${
        selected ? 'border-indigo-300 bg-indigo-50/60' : 'border-gray-200 bg-white'
      }`}
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start">
        <div className="flex min-w-0 flex-1 items-start gap-3">
          <input
            id={inputId}
            type="checkbox"
            checked={selected}
            onChange={onToggle}
            aria-describedby={`${inputId}-about`}
            className="mt-0.5 h-4 w-4 flex-shrink-0 cursor-pointer accent-indigo-600"
          />
          <div className="min-w-0 space-y-1.5">
            <label htmlFor={inputId} className="block cursor-pointer text-sm font-medium leading-5 text-gray-900">
              {service.label}
            </label>
            <p id={`${inputId}-about`} className="text-xs leading-5 text-gray-500">
              {service.description}
            </p>

            {assessment && (
              <p className="flex items-start gap-1.5 text-xs leading-5 text-gray-700">
                <Sparkles className="mt-0.5 h-3.5 w-3.5 flex-shrink-0 text-indigo-500" aria-hidden="true" />
                <span>
                  <span className="sr-only">AI suggestion: </span>
                  {assessment.reason}
                </span>
              </p>
            )}
            {assessment?.evidence && (
              <blockquote className="border-l-2 border-indigo-200 pl-3 text-xs italic leading-5 text-gray-600">
                <span className="sr-only">From the transcript: </span>“{assessment.evidence}”
              </blockquote>
            )}
          </div>
        </div>

        {selected && (
          <div className="pl-7 sm:flex-shrink-0 sm:pl-0">
            <WriteUpControl serviceKey={service.key} writeUp={writeUp} onGenerate={onGenerateWriteUp} />
          </div>
        )}
      </div>
    </li>
  );
}

function WriteUpControl({
  serviceKey,
  writeUp,
  onGenerate,
}: {
  serviceKey: ServiceKey;
  writeUp?: ServiceWriteUpState;
  onGenerate: () => void;
}) {
  if (writeUp?.status === 'loading') {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs text-gray-600">
        <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-gray-400 border-t-transparent" />
        Writing up...
      </span>
    );
  }

  if (writeUp?.status === 'ready') {
    return (
      <a
        href={`#write-up-${serviceKey}`}
        className="inline-flex items-center gap-1.5 rounded text-xs font-medium text-emerald-700 hover:underline focus:outline-none focus:ring-2 focus:ring-emerald-500"
      >
        <Check className="h-3.5 w-3.5" />
        Write-up ready
      </a>
    );
  }

  return (
    <Button variant="outline" size="sm" onClick={onGenerate} className="gap-1.5 text-xs">
      {writeUp?.status === 'error' ? (
        <>
          <AlertCircle className="h-3.5 w-3.5 text-red-600" />
          Try again
        </>
      ) : (
        <>
          <ClipboardCheck className="h-3.5 w-3.5" />
          Write up
        </>
      )}
    </Button>
  );
}
