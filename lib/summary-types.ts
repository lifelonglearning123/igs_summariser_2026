import type { ServiceKey } from './prompts';

export interface ServiceAssessment {
  covered: boolean;
  reason: string;
}

export type ServiceAssessments = Record<ServiceKey, ServiceAssessment>;

/** Shape returned by POST /api/summary. */
export interface SummaryResponse {
  /** Markdown for the "Main Discussion Points" section. */
  main_points: string;
  /** Markdown for the "Recommendations" section. */
  recommendations: string;
  /** AI assessment of which services the meeting covered; null if it failed. */
  services: ServiceAssessments | null;
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
