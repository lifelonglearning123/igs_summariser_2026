/**
 * Deciding which emails are worth reading properly.
 *
 * A real inbox is mostly not funding. Syncing thirty days of one turned up 408
 * messages, and sending all of them to a model would take an hour and cost
 * real money to learn that four hundred of them were meeting invitations and
 * newsletters.
 *
 * So the same shape as the client prefilter: a cheap, deterministic pass that
 * anything plausibly about funding survives, before a single token is spent.
 * It is deliberately generous - a false positive costs one model call, which
 * then classifies the email as a newsletter and files it under noise, whereas
 * a false negative loses a competition entirely. When in doubt it lets the
 * email through.
 */

export interface TriageResult {
  relevant: boolean;
  score: number;
  /** What made it look like funding, for showing the coach why. */
  matched: string[];
}

/** Named funders, programmes and services. Nearly conclusive on their own. */
const FUNDERS = [
  'innovate uk', 'ukri', 'iuk', 'innovation funding service', 'horizon europe', 'eic accelerator',
  'epsrc', 'bbsrc', 'nerc', 'stfc', 'mrc', 'ahrc', 'esrc',
  'catapult', 'sbri', 'ktp', 'knowledge transfer partnership', 'eureka', 'eurostars',
  'growth hub', 'business connect', 'enterprise europe network', 'made smarter',
  'department for business and trade', 'dbt', 'defra', 'dstl', 'aerospace technology institute',
  'apc', 'advanced propulsion centre', 'faraday', 'ofgem', 'net zero innovation portfolio',
  'british business bank', 'innovation loan', 'smart grant', 'biomedical catalyst',
];

/** Words that describe a funding call. Several together make a strong signal. */
const CALL_WORDS = [
  'grant', 'funding', 'funded', 'competition', 'call for proposals', 'expression of interest',
  'closing date', 'deadline', 'eligibility', 'eligible', 'consortium', 'collaborative r&d',
  'match funding', 'intervention rate', 'application', 'apply', 'applicant', 'bid',
  'award', 'feasibility study', 'scope', 'briefing', 'competition opens', 'competition closes',
  'scored questions', 'work packages', 'project partners',
];

/** Domains that only ever appear in funding correspondence. */
const URL_SIGNALS = [
  'apply-for-innovation-funding.service.gov.uk',
  'iuk-business-connect.org.uk',
  'ukri.org',
  'gov.uk/guidance/innovation',
  'ec.europa.eu/info/funding-tenders',
];

/** Phrases that mark an email as definitely not a funding call. */
const NEGATIVE_SIGNALS = [
  'out of office', 'automatic reply', 'undeliverable', 'delivery has failed',
  'meeting invitation', 'accepted:', 'declined:', 'tentative:', 'canceled:', 'cancelled:',
  'your order', 'invoice attached', 'remittance', 'payslip', 'password reset',
  'unsubscribe from all', 'calendar invite',
];

const MIN_SCORE = 4;

function countMatches(haystack: string, needles: string[]): string[] {
  return needles.filter((needle) => haystack.includes(needle));
}

/**
 * Score one email on how likely it is to be about funding.
 *
 * The subject counts for more than the body: a funding email says so in its
 * subject, whereas the word "grant" turns up in the footer of all sorts.
 */
export function triageEmail(subject: string | null, body: string): TriageResult {
  const subjectText = (subject ?? '').toLowerCase();
  const bodyText = body.toLowerCase().slice(0, 8000);
  const combined = `${subjectText}\n${bodyText}`;
  const matched: string[] = [];
  let score = 0;

  // An automatic reply or a meeting acceptance is never a competition, however
  // many funding words the quoted thread underneath it happens to contain.
  const negatives = countMatches(subjectText, NEGATIVE_SIGNALS);
  if (negatives.length) {
    return { relevant: false, score: 0, matched: [`looks like ${negatives[0]}`] };
  }

  const urls = countMatches(bodyText, URL_SIGNALS);
  if (urls.length) {
    score += 6;
    matched.push(urls[0]);
  }

  const funders = countMatches(combined, FUNDERS);
  if (funders.length) {
    score += Math.min(funders.length, 2) * 3;
    matched.push(...funders.slice(0, 2));
  }

  const subjectCalls = countMatches(subjectText, CALL_WORDS);
  if (subjectCalls.length) {
    score += Math.min(subjectCalls.length, 3) * 2;
    matched.push(...subjectCalls.slice(0, 2));
  }

  const bodyCalls = countMatches(bodyText, CALL_WORDS);
  if (bodyCalls.length >= 3) {
    score += 2;
    if (!subjectCalls.length) matched.push(...bodyCalls.slice(0, 2));
  }

  // A money figure alongside any call word is what a competition looks like.
  if (/£\s?\d[\d,.]*\s?(k|m|bn|million|billion)?\b/i.test(bodyText) && bodyCalls.length >= 2) {
    score += 2;
    matched.push('a funding amount');
  }

  return { relevant: score >= MIN_SCORE, score, matched: Array.from(new Set(matched)) };
}
