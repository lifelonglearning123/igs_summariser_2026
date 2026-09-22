/**
 * Turns a closing date into a decide-by date.
 *
 * The closing date is the number in the email and it is the wrong one to act
 * on: by the time a competition closes in three weeks the decision needed
 * making a month ago. What a coach needs is the last day a client could
 * realistically start and still submit something worth scoring, which is the
 * closing date less the lead time the bid actually needs - drafting, assembling
 * a consortium, and any review service that wants notice.
 *
 * The estimate is deliberately explainable rather than clever: every addend is
 * returned in `reasoning` so a coach who thinks three weeks of drafting is
 * generous can see exactly which line to disagree with.
 */

import type { OpportunityCard, OpportunityTiming, SupportDate, Urgency } from './opportunity-types';

/** Days assumed for the go/no-go itself: reaching the client and a decision. */
const BASE_DECISION_DAYS = 7;

/** Drafting time when the email does not say how much writing is involved. */
const DEFAULT_WRITING_DAYS = 10;

/** Extra lead time when the competition forces a consortium to be built. */
const COLLABORATION_DAYS = 10;

/** Extra lead time when a named end user has to be recruited into the plan. */
const END_USER_DAYS = 7;

const MS_PER_DAY = 24 * 60 * 60 * 1000;

const COLLABORATION_PATTERN = /\b(collaborat|consortium|partner(ship)?s?\b|business[- ]led)/i;
const END_USER_PATTERN = /\b(end[- ]user|end user)/i;

/**
 * Parse the dates that turn up in these emails. The model is asked for ISO,
 * but UK-style dates leak through from quoted text, and 28.10.2026 must not be
 * read as an American month-first date.
 */
export function parseFlexibleDate(value: string | null | undefined): Date | null {
  if (!value) return null;
  const text = value.trim();
  if (!text) return null;

  const iso = /^(\d{4})-(\d{2})-(\d{2})/.exec(text);
  if (iso) {
    return toUtcDate(Number(iso[1]), Number(iso[2]), Number(iso[3]));
  }

  // dd/mm/yyyy, dd.mm.yyyy, dd-mm-yyyy - always day first, as UK funders write them.
  const uk = /^(\d{1,2})[./-](\d{1,2})[./-](\d{4})/.exec(text);
  if (uk) {
    return toUtcDate(Number(uk[3]), Number(uk[2]), Number(uk[1]));
  }

  const parsed = new Date(text);
  if (!Number.isNaN(parsed.getTime())) {
    return toUtcDate(parsed.getUTCFullYear(), parsed.getUTCMonth() + 1, parsed.getUTCDate());
  }

  return null;
}

function toUtcDate(year: number, month: number, day: number): Date | null {
  if (month < 1 || month > 12 || day < 1 || day > 31) return null;
  const date = new Date(Date.UTC(year, month - 1, day));
  // Reject rolled-over dates such as 31 February.
  if (date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) return null;
  return date;
}

/** Midnight UTC today, so day counts do not wobble with the clock. */
function startOfToday(now: Date): Date {
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
}

function daysBetween(from: Date, to: Date): number {
  return Math.round((to.getTime() - from.getTime()) / MS_PER_DAY);
}

export function toIsoDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

/** "Tue 28 Oct 2026", for the UI. */
export function formatUkDate(value: string | null | undefined): string {
  const date = parseFlexibleDate(value);
  if (!date) return 'not stated';
  return date.toLocaleDateString('en-GB', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
  });
}

/** Drafting time implied by the scored questions and their word limit. */
function writingDays(card: OpportunityCard): { days: number; note: string } {
  const questions = card.scored_questions ?? 0;
  const words = card.word_limit ?? 0;

  if (questions > 0 && words > 0) {
    const totalWords = questions * words;
    if (totalWords >= 3000) {
      return { days: 21, note: `${questions} scored questions at ${words} words each (~${totalWords} words) - allow 3 weeks to draft` };
    }
    if (totalWords >= 1500) {
      return { days: 14, note: `${questions} scored questions at ${words} words each (~${totalWords} words) - allow 2 weeks to draft` };
    }
    return { days: 7, note: `${questions} scored questions at ${words} words each - allow a week to draft` };
  }

  if (questions >= 8) {
    return { days: 21, note: `${questions} scored questions - allow 3 weeks to draft` };
  }
  if (questions > 0) {
    return { days: 14, note: `${questions} scored questions - allow 2 weeks to draft` };
  }

  return { days: DEFAULT_WRITING_DAYS, note: 'application length not stated - allowing a fortnight to draft' };
}

function gateText(card: OpportunityCard): string {
  return [
    ...card.hard_gates.map((gate) => gate.requirement),
    ...card.soft_signals,
    card.summary,
  ].join(' ');
}

function urgencyFor(daysToClose: number | null, daysToDecide: number | null): Urgency {
  if (daysToClose === null || daysToDecide === null) return 'unknown';
  if (daysToClose < 0) return 'closed';
  if (daysToDecide <= 7) return 'critical';
  if (daysToDecide <= 21) return 'tight';
  return 'comfortable';
}

/** Support dates still ahead of us, soonest first. */
function upcomingSupport(card: OpportunityCard, today: Date): SupportDate[] {
  return card.support_dates
    .map((entry) => ({ entry, date: parseFlexibleDate(entry.date) }))
    .filter((item) => item.date !== null && item.date.getTime() >= today.getTime())
    .sort((a, b) => (a.date as Date).getTime() - (b.date as Date).getTime())
    .map((item) => item.entry);
}

/**
 * Work out when a coach has to have made the call, and show the working.
 */
export function computeTiming(card: OpportunityCard, now: Date = new Date()): OpportunityTiming {
  const today = startOfToday(now);
  const closing = parseFlexibleDate(card.closing_date);
  const reasoning: string[] = [];

  let leadTime = BASE_DECISION_DAYS;
  reasoning.push(`${BASE_DECISION_DAYS} days to reach the client and get a go/no-go`);

  const writing = writingDays(card);
  leadTime += writing.days;
  reasoning.push(`${writing.days} days: ${writing.note}`);

  if (card.review_lead_days && card.review_lead_days > 0) {
    leadTime += card.review_lead_days;
    reasoning.push(`${card.review_lead_days} days: a review service wants the draft that far before the deadline`);
  }

  const gates = gateText(card);
  if (COLLABORATION_PATTERN.test(gates)) {
    leadTime += COLLABORATION_DAYS;
    reasoning.push(`${COLLABORATION_DAYS} days to line up a consortium, which this competition requires`);
  }
  if (END_USER_PATTERN.test(gates)) {
    leadTime += END_USER_DAYS;
    reasoning.push(`${END_USER_DAYS} days to secure a named end user with a real role in the project`);
  }

  if (!closing) {
    return {
      closing_date: null,
      days_to_close: null,
      decide_by: null,
      days_to_decide: null,
      lead_time_days: leadTime,
      reasoning: [...reasoning, 'No closing date was found in the email, so a decide-by date cannot be worked out.'],
      urgency: 'unknown',
      upcoming_support: upcomingSupport(card, today),
    };
  }

  const decideBy = new Date(closing.getTime() - leadTime * MS_PER_DAY);
  const daysToClose = daysBetween(today, closing);
  const daysToDecide = daysBetween(today, decideBy);

  return {
    closing_date: toIsoDate(closing),
    days_to_close: daysToClose,
    decide_by: toIsoDate(decideBy),
    days_to_decide: daysToDecide,
    lead_time_days: leadTime,
    reasoning,
    urgency: urgencyFor(daysToClose, daysToDecide),
    upcoming_support: upcomingSupport(card, today),
  };
}

/** One line summarising the timing, for the top of the call sheet. */
export function timingHeadline(timing: OpportunityTiming): string {
  if (timing.urgency === 'unknown') return 'No closing date found in this email.';
  if (timing.urgency === 'closed') return 'This competition has already closed.';

  const days = timing.days_to_decide ?? 0;
  const closes = `closes ${formatUkDate(timing.closing_date)}`;

  if (days < 0) {
    return `Decide-by date has passed (${formatUkDate(timing.decide_by)}) - only worth a call if the client can move fast. ${closes}.`;
  }
  if (days === 0) {
    return `Decide by today to have a realistic run at it. ${closes}.`;
  }
  return `Decide by ${formatUkDate(timing.decide_by)} - ${days} day${days === 1 ? '' : 's'} to make the call. ${closes}.`;
}
