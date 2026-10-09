/**
 * Jobs impact the IGS reports to Innovate UK: jobs created and jobs saved /
 * safeguarded / maintained, each split into achieved and forecast, all in
 * full-time equivalents (FTE). The AI suggests the figures; the coach checks
 * and corrects them on the dashboard before they go into the summary.
 */
import type { JobsFigure, JobsImpact } from './summary-types';

export type JobKind = 'created' | 'safeguarded';
export type JobTiming = 'achieved' | 'forecast';

export const JOB_KINDS: { key: JobKind; label: string; description: string }[] = [
  {
    key: 'created',
    label: 'Jobs created',
    description: 'New roles the business has added, or plans to add.',
  },
  {
    key: 'safeguarded',
    label: 'Jobs saved / safeguarded / maintained',
    description: 'Existing roles that were at risk and are being kept.',
  },
];

export const JOB_TIMINGS: { key: JobTiming; label: string }[] = [
  { key: 'achieved', label: 'Achieved' },
  { key: 'forecast', label: 'Forecast' },
];

export const JOBS_HEADING = 'Jobs Impact (FTE)';

/** The coach's FTE figures as typed, so a half-typed "1." survives a re-render. */
export type JobsFte = Record<JobKind, Record<JobTiming, string>>;

/** Start the editable figures from the AI's suggestions; blank where there are none. */
export function initialJobsFte(jobs: JobsImpact | null): JobsFte {
  const value = (figure?: JobsFigure) => (figure?.fte == null ? '' : String(figure.fte));
  return {
    created: { achieved: value(jobs?.created.achieved), forecast: value(jobs?.created.forecast) },
    safeguarded: { achieved: value(jobs?.safeguarded.achieved), forecast: value(jobs?.safeguarded.forecast) },
  };
}

/** A typed FTE figure as a number, or null when it is blank or not a valid figure. */
export function parseFte(text: string): number | null {
  const trimmed = text.trim();
  if (!trimmed) return null;
  const value = Number(trimmed);
  return Number.isFinite(value) && value >= 0 ? value : null;
}

export interface JobsLine {
  label: string;
  value: string;
  detail: string;
}

/** One line per figure, in a fixed order, for the copied summary and the Word document. */
export function jobsLines(fte: JobsFte, jobs: JobsImpact | null): JobsLine[] {
  return JOB_KINDS.flatMap((kind) =>
    JOB_TIMINGS.map((timing) => {
      const figure = jobs?.[kind.key][timing.key];
      const value = parseFte(fte[kind.key][timing.key]);
      return {
        label: `${kind.label} (${timing.label.toLowerCase()})`,
        value:
          value !== null ? `${value} FTE` : figure?.discussed ? 'Discussed, no figure given' : 'None identified',
        detail: figure?.discussed ? figure.detail : '',
      };
    })
  );
}
