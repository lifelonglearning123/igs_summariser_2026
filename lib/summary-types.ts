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
  /** Non-fatal notes for the user, e.g. the transcript was split into parts. */
  warnings: string[];
}
