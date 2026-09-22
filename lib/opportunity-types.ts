/**
 * Types for the opportunity matcher: the funding email on one side, the client
 * register on the other, and the call sheet that comes out of putting the two
 * together.
 */

/* ------------------------------------------------------------------ */
/* The client register                                                 */
/* ------------------------------------------------------------------ */

/**
 * A quote from a meeting backing up one field of a client record. Every claim
 * the matcher makes has to trace back to one of these: no evidence, no
 * recommendation. It is what stops the call sheet being a plausible-sounding
 * guess about a client you last spoke to a year ago.
 */
export interface Evidence {
  /** The field this backs up, e.g. "tech_tags" or "match_funding_capacity". */
  field?: string;
  /** The coach's own words from the meeting. */
  quote: string;
  /** When it was said. ISO date where known. */
  meeting_date?: string;
}

export type SmeStatus = 'micro' | 'small' | 'medium' | 'large' | 'unknown';
export type GrantAppetite = 'keen' | 'open' | 'reluctant' | 'unknown';
export type FundingCapacity = 'strong' | 'possible' | 'unlikely' | 'unknown';

/**
 * One client, as the register holds them. Everything past `name` is optional:
 * a register built up from meeting summaries is sparse by nature, and the
 * matcher is built to turn the gaps into questions rather than rejections.
 */
export interface ClientRecord {
  id: string;
  name: string;
  igs_owner?: string;
  /** ISO date of the last meeting. */
  last_contact?: string;
  meeting_count?: number;

  /** False for universities, RTOs and other non-business organisations. */
  is_business?: boolean;
  sme_status?: SmeStatus;
  headcount?: number;
  turnover_band?: string;

  /** Taxonomy keys from `IS_SECTORS`. */
  sectors?: string[];
  /** Taxonomy keys from `TECH_TAGS`. */
  tech_tags?: string[];
  trl_band?: string;

  grant_history?: string[];
  grant_appetite?: GrantAppetite;
  match_funding_capacity?: FundingCapacity;

  /** Universities, suppliers and end users named in meetings. */
  named_partners?: string[];
  /** Bids already in flight: a capacity check, not a disqualifier. */
  live_bids?: string[];

  notes?: string;
  evidence?: Evidence[];
}

export interface ClientRegister {
  version?: number;
  updated?: string;
  clients: ClientRecord[];
}

/* ------------------------------------------------------------------ */
/* The opportunity                                                     */
/* ------------------------------------------------------------------ */

/**
 * What kind of email this is. Only `competition` is worth matching clients
 * against; the rest is the noise the triage step exists to strip out.
 */
export type OpportunityType = 'competition' | 'event' | 'reminder' | 'newsletter' | 'admin' | 'other';

/**
 * One eligibility rule, written as a statement that can be tested against a
 * client record. `hard` rules exclude; `soft` rules only shape the ranking.
 */
export interface OpportunityGate {
  id: string;
  requirement: string;
  severity: 'hard' | 'soft';
}

export interface OpportunityTheme {
  name: string;
  sub_themes: string[];
}

/** A clinic, brokerage event or review deadline attached to the competition. */
export interface SupportDate {
  label: string;
  /** ISO date where one was given. */
  date: string | null;
  note?: string;
}

export interface OpportunityCard {
  type: OpportunityType;
  /** True only when there is a competition worth matching clients against. */
  actionable: boolean;
  funder: string | null;
  name: string | null;
  url: string | null;
  /** Two or three sentences a coach can read instead of the email. */
  summary: string;

  /** ISO dates. */
  closing_date: string | null;
  project_start: string | null;
  project_window: string | null;

  grant_min: number | null;
  grant_max: number | null;
  total_pot: number | null;

  hard_gates: OpportunityGate[];
  themes: OpportunityTheme[];
  /** Things the bid must argue well, short of being an eligibility rule. */
  soft_signals: string[];

  sectors: string[];
  tech_tags: string[];

  support_dates: SupportDate[];
  /** Scored questions and the word limit per question, for the effort estimate. */
  scored_questions: number | null;
  word_limit: number | null;
  /**
   * Working days of notice a named review service needs, where the email gives
   * one as a relative rule ("at least 2 weeks before the closing date") rather
   * than a fixed date. Feeds straight into the decide-by calculation.
   */
  review_lead_days: number | null;

  warnings: string[];
}

/* ------------------------------------------------------------------ */
/* Timing                                                              */
/* ------------------------------------------------------------------ */

export type Urgency = 'closed' | 'critical' | 'tight' | 'comfortable' | 'unknown';

/**
 * The derived dates. The closing date is in the email; the decide-by date is
 * the one that actually governs whether a coach should pick up the phone, and
 * it is the single most useful thing the app computes.
 */
export interface OpportunityTiming {
  closing_date: string | null;
  days_to_close: number | null;
  /** Closing date less the lead time the bid realistically needs. */
  decide_by: string | null;
  days_to_decide: number | null;
  lead_time_days: number;
  /** Each addend, spelled out, so the coach can argue with the number. */
  reasoning: string[];
  urgency: Urgency;
  /** Support dates still in the future, soonest first. */
  upcoming_support: SupportDate[];
}

/* ------------------------------------------------------------------ */
/* The match                                                           */
/* ------------------------------------------------------------------ */

/**
 * Three-valued on purpose. A register built from meeting notes will not know
 * whether a client can raise match funding, and a boolean gate would throw
 * away every client on the strength of a silence. `unknown` becomes a question
 * on the call sheet instead.
 */
export type GateVerdict = 'pass' | 'fail' | 'unknown';

export interface GateAssessment {
  gate_id: string;
  requirement: string;
  verdict: GateVerdict;
  /** The evidence for a pass or fail, or the question to ask for an unknown. */
  note: string;
}

export type MatchVerdict = 'strong' | 'possible' | 'long_shot' | 'excluded';

export interface ClientMatch {
  client_id: string;
  client_name: string;
  igs_owner: string | null;
  last_contact: string | null;
  verdict: MatchVerdict;
  /** 0-100, for ordering within a verdict band. */
  score: number;
  /** Why this client, in the coach's terms. */
  why: string;
  evidence: Evidence[];
  gates: GateAssessment[];
  /** The unknowns, turned into things to ask on the call. */
  questions_to_ask: string[];
  /** What the client would have to line up to be eligible. */
  gaps: string[];
  /** A first line for the email or call. */
  opening_line: string;
}

/** A client the matcher ruled out, and why. Shown so silence is legible. */
export interface ExcludedClient {
  client_id: string;
  client_name: string;
  reason: string;
}

export interface CallSheet {
  opportunity: OpportunityCard;
  timing: OpportunityTiming;
  matches: ClientMatch[];
  excluded: ExcludedClient[];
  /** How many of the register got past the prefilter and into the model call. */
  shortlisted: number;
  register_size: number;
  warnings: string[];
}

/* ------------------------------------------------------------------ */
/* The inbox                                                           */
/* ------------------------------------------------------------------ */

/** One email that carried a competition. The same one often arrives several times. */
export interface EmailSource {
  from: string | null;
  subject: string | null;
  /** ISO datetime the message was sent. */
  received_at: string | null;
}

/**
 * One competition in the sorted inbox, together with every email that brought
 * it in. Two forwards of the same call collapse into one item with two
 * sources, so a morning's post becomes a list of opportunities rather than a
 * list of messages.
 */
export interface InboxItem {
  /** Fingerprint of the competition itself, not of the email. */
  id: string;
  opportunity: OpportunityCard;
  timing: OpportunityTiming;
  sources: EmailSource[];
  warnings: string[];
}

export interface InboxResponse {
  items: InboxItem[];
  /** How many emails came in, before de-duplication. */
  processed: number;
  duplicates_merged: number;
  warnings: string[];
}

/* ------------------------------------------------------------------ */
/* API payloads                                                        */
/* ------------------------------------------------------------------ */

export interface OpportunityParseResponse {
  opportunity: OpportunityCard;
  timing: OpportunityTiming;
  warnings: string[];
}

export type MatchResponse = CallSheet;

export const MATCH_VERDICT_LABELS: Record<MatchVerdict, string> = {
  strong: 'Strong',
  possible: 'Possible',
  long_shot: 'Long shot',
  excluded: 'Excluded',
};

export const OPPORTUNITY_TYPE_LABELS: Record<OpportunityType, string> = {
  competition: 'Funding competition',
  event: 'Event or webinar',
  reminder: 'Deadline reminder',
  newsletter: 'Newsletter',
  admin: 'Admin',
  other: 'Other',
};
