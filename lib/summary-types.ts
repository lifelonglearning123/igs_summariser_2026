import type { ServiceKey } from './services';

/**
 * How far the meeting covered a support. The model judges what was said, not
 * whether the client could benefit.
 */
export type ServiceRelevance = 'discussed' | 'mentioned' | 'not_discussed';

export interface ServiceAssessment {
  relevance: ServiceRelevance;
  /** One plain-English sentence for the coach. */
  reason: string;
  /**
   * A short quote from the transcript backing the verdict. Empty when there is
   * none, or when the model's quote could not be found in the transcript.
   */
  evidence: string;
}

export type ServiceAssessments = Record<ServiceKey, ServiceAssessment>;

/** One jobs figure the AI found in the meeting, for Innovate UK reporting. */
export interface JobsFigure {
  /** True when the meeting talked about this kind of job change. */
  discussed: boolean;
  /** Full-time equivalents; null when not discussed or no figure could be worked out. */
  fte: number | null;
  /** One plain-English sentence: roles, headcount, hours and how the FTE was reached. */
  detail: string;
  /** A short verified quote from the transcript; empty when there is none. */
  evidence: string;
}

export interface JobsImpact {
  created: { achieved: JobsFigure; forecast: JobsFigure };
  safeguarded: { achieved: JobsFigure; forecast: JobsFigure };
}

/** Shape returned by POST /api/summary. */
export interface SummaryResponse {
  /** Markdown for the "Main Discussion Points" section. */
  main_points: string;
  /** Markdown for the "Recommendations" section. */
  recommendations: string;
  /** AI assessment of the meeting against every Salesforce support; null if it failed. */
  services: ServiceAssessments | null;
  /** Jobs created and saved, in FTE, for Innovate UK reporting; null if it failed. */
  jobs: JobsImpact | null;
  /**
   * The transcript text the summary was built from, so the dashboard can ask
   * for a per-service write-up later without re-uploading the file.
   */
  transcript: string;
  /** Non-fatal notes for the user, e.g. the transcript was split into parts. */
  warnings: string[];
}

/** Shape returned by POST /api/service-writeup. */
export interface ServiceWriteUpResponse {
  service: ServiceKey;
  /** Markdown for the write-up the coach pastes into Salesforce. */
  text: string;
  warnings: string[];
}

/** Per-service write-up state held by the dashboard. */
export type ServiceWriteUpState =
  | { status: 'loading' }
  | { status: 'ready'; text: string; warnings: string[]; generatedAt: Date }
  | { status: 'error'; message: string };

export type ServiceWriteUps = Partial<Record<ServiceKey, ServiceWriteUpState>>;
