import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Briefcase, Sparkles } from 'lucide-react';
import { JOB_KINDS, JOB_TIMINGS, JobKind, JobsFte, JobTiming, parseFte } from '@/lib/jobs';
import type { JobsFigure, JobsImpact as JobsImpactData } from '@/lib/summary-types';

interface JobsImpactProps {
  /** The AI's figures; null when the jobs assessment failed. */
  jobs: JobsImpactData | null;
  /** The figures as the coach has them, which go into the copied summary and Word document. */
  fte: JobsFte;
  onChange: (kind: JobKind, timing: JobTiming, value: string) => void;
}

/**
 * Jobs created and saved for Innovate UK reporting, in FTE. The AI fills the
 * figures in; the coach can correct any of them before reporting.
 */
export default function JobsImpact({ jobs, fte, onChange }: JobsImpactProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Briefcase className="h-5 w-5 text-teal-600" />
          Jobs impact
        </CardTitle>
        <CardDescription>
          {jobs
            ? 'Full-time equivalents (FTE) for Innovate UK reporting, worked out from the transcript. Check each figure and correct it before you report.'
            : "The figures couldn't be worked out from this transcript. Enter any jobs created or saved, in full-time equivalents (FTE)."}
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-6">
        {JOB_KINDS.map((kind) => (
          <section key={kind.key} aria-labelledby={`jobs-${kind.key}`} className="space-y-2">
            <div>
              <h3 id={`jobs-${kind.key}`} className="text-sm font-semibold text-gray-900">
                {kind.label}
              </h3>
              <p className="mt-0.5 text-xs text-gray-500">{kind.description}</p>
            </div>
            <ul className="grid gap-2 sm:grid-cols-2">
              {JOB_TIMINGS.map((timing) => (
                <JobsRow
                  key={timing.key}
                  id={`jobs-${kind.key}-${timing.key}`}
                  label={timing.label}
                  figure={jobs?.[kind.key][timing.key]}
                  value={fte[kind.key][timing.key]}
                  onChange={(value) => onChange(kind.key, timing.key, value)}
                />
              ))}
            </ul>
          </section>
        ))}
      </CardContent>
    </Card>
  );
}

interface JobsRowProps {
  id: string;
  label: string;
  figure?: JobsFigure;
  value: string;
  onChange: (value: string) => void;
}

function JobsRow({ id, label, figure, value, onChange }: JobsRowProps) {
  const invalid = value.trim() !== '' && parseFte(value) === null;
  const edited = figure !== undefined && parseFte(value) !== figure.fte && !invalid;

  return (
    <li
      className={`rounded-lg border p-3 ${figure?.discussed ? 'border-teal-300 bg-teal-50/60' : 'border-gray-200 bg-white'}`}
    >
      <div className="flex items-center justify-between gap-3">
        <label htmlFor={id} className="text-sm font-medium text-gray-900">
          {label}
        </label>
        <div className="flex items-center gap-1.5">
          <input
            id={id}
            type="number"
            inputMode="decimal"
            min={0}
            step={0.1}
            value={value}
            placeholder="0"
            onChange={(event) => onChange(event.target.value)}
            aria-invalid={invalid}
            aria-describedby={`${id}-about`}
            className={`w-20 rounded-md border px-2 py-1 text-right text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 ${
              invalid ? 'border-red-400' : 'border-gray-300'
            }`}
          />
          <span className="text-xs text-gray-500">FTE</span>
        </div>
      </div>

      <div id={`${id}-about`} className="mt-2 space-y-1.5">
        {invalid && <p className="text-xs text-red-700">Enter a number of 0 or more.</p>}
        {figure?.discussed && (
          <p className="flex items-start gap-1.5 text-xs leading-5 text-gray-700">
            <Sparkles className="mt-0.5 h-3.5 w-3.5 flex-shrink-0 text-teal-600" aria-hidden="true" />
            <span>
              <span className="sr-only">AI suggestion: </span>
              {figure.detail}
              {edited && <span className="text-gray-500"> (AI figure: {figure.fte ?? 'none'})</span>}
            </span>
          </p>
        )}
        {figure?.evidence && (
          <blockquote className="border-l-2 border-teal-200 pl-3 text-xs italic leading-5 text-gray-600">
            <span className="sr-only">From the transcript: </span>“{figure.evidence}”
          </blockquote>
        )}
        {figure && !figure.discussed && <p className="text-xs text-gray-500">Not discussed in this meeting.</p>}
      </div>
    </li>
  );
}
