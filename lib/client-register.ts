/**
 * Reading, validating and prefiltering the client register.
 *
 * The register is the app's memory of who the coaches look after. It is
 * deliberately a plain JSON file rather than a database: it can be exported
 * from Salesforce, hand-edited, and thrown away, which is what you want while
 * you are still finding out whether the matching is any good.
 *
 * The prefilter here is the cheap half of the match. It scores every client
 * against the opportunity with no model call at all, so only a shortlist ever
 * reaches the language model. On a register of a few hundred clients that is
 * the difference between a penny an email and a pound an email, and it also
 * keeps the model's context small enough that it reasons well.
 */

import type {
  ClientRecord,
  ClientRegister,
  Evidence,
  ExcludedClient,
  OpportunityCard,
} from './opportunity-types';
import { isSectorKey, isTechTagKey, labelForKey, tagsInText, TECH_TAGS } from './taxonomy';

/** How many clients get past the prefilter and into the model call. */
export const DEFAULT_SHORTLIST_SIZE = 25;

/**
 * The topical relevance a client needs before they can reach the shortlist at
 * all. Worth one declared technology tag in common with the competition, or
 * one tag inferred from the coach's notes, or two of the competition's own
 * theme words appearing in their record.
 */
const MIN_TOPICAL_SCORE = 3;

/* ------------------------------------------------------------------ */
/* Parsing                                                             */
/* ------------------------------------------------------------------ */

function asString(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim() ? value.trim() : undefined;
}

function asStringArray(value: unknown): string[] | undefined {
  if (!Array.isArray(value)) return undefined;
  const items = value.map(asString).filter((item): item is string => Boolean(item));
  return items.length ? items : undefined;
}

function asNumber(value: unknown): number | undefined {
  const parsed = typeof value === 'number' ? value : typeof value === 'string' ? Number(value) : NaN;
  return Number.isFinite(parsed) ? parsed : undefined;
}

function asEnum<T extends string>(value: unknown, allowed: readonly T[]): T | undefined {
  return typeof value === 'string' && (allowed as readonly string[]).includes(value) ? (value as T) : undefined;
}

function asEvidence(value: unknown): Evidence[] | undefined {
  if (!Array.isArray(value)) return undefined;
  const items: Evidence[] = [];
  for (const entry of value) {
    if (typeof entry === 'string') {
      items.push({ quote: entry });
      continue;
    }
    if (entry && typeof entry === 'object') {
      const quote = asString((entry as Evidence).quote);
      if (!quote) continue;
      items.push({
        quote,
        field: asString((entry as Evidence).field),
        meeting_date: asString((entry as Evidence).meeting_date),
      });
    }
  }
  return items.length ? items : undefined;
}

function slugify(name: string, index: number): string {
  const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  return slug || `client-${index + 1}`;
}

/**
 * Turn whatever JSON the user uploaded into records we can rely on. Unknown
 * keys are dropped and bad values are ignored rather than rejected: a register
 * exported by hand should not fail wholesale because one row has a typo.
 */
export function parseRegister(raw: unknown): { register: ClientRegister; warnings: string[] } {
  const warnings: string[] = [];
  const source = (Array.isArray(raw) ? { clients: raw } : raw) as Partial<ClientRegister> | null;

  if (!source || typeof source !== 'object' || !Array.isArray(source.clients)) {
    throw new Error('The register must be a JSON array of clients, or an object with a "clients" array.');
  }

  const seenIds = new Set<string>();
  const clients: ClientRecord[] = [];

  source.clients.forEach((entry: unknown, index: number) => {
    if (!entry || typeof entry !== 'object') {
      warnings.push(`Entry ${index + 1} in the register is not an object and was skipped.`);
      return;
    }

    const record = entry as Record<string, unknown>;
    const name = asString(record.name);
    if (!name) {
      warnings.push(`Entry ${index + 1} in the register has no name and was skipped.`);
      return;
    }

    let id = asString(record.id) ?? slugify(name, index);
    if (seenIds.has(id)) {
      id = `${id}-${index + 1}`;
      warnings.push(`Two clients share the id "${asString(record.id) ?? id}"; the second was renamed to keep them apart.`);
    }
    seenIds.add(id);

    const sectors = asStringArray(record.sectors)?.filter(isSectorKey);
    const declaredTags = asStringArray(record.tech_tags);
    const knownTags = declaredTags?.filter(isTechTagKey);
    if (declaredTags && knownTags && declaredTags.length !== knownTags.length) {
      const unknown = declaredTags.filter((tag) => !isTechTagKey(tag));
      warnings.push(`${name}: ignoring tech tags not in the taxonomy (${unknown.join(', ')}).`);
    }

    clients.push({
      id,
      name,
      igs_owner: asString(record.igs_owner),
      last_contact: asString(record.last_contact),
      meeting_count: asNumber(record.meeting_count),
      is_business: typeof record.is_business === 'boolean' ? record.is_business : undefined,
      sme_status: asEnum(record.sme_status, ['micro', 'small', 'medium', 'large', 'unknown'] as const),
      headcount: asNumber(record.headcount),
      turnover_band: asString(record.turnover_band),
      sectors,
      tech_tags: knownTags,
      trl_band: asString(record.trl_band),
      grant_history: asStringArray(record.grant_history),
      grant_appetite: asEnum(record.grant_appetite, ['keen', 'open', 'reluctant', 'unknown'] as const),
      match_funding_capacity: asEnum(record.match_funding_capacity, ['strong', 'possible', 'unlikely', 'unknown'] as const),
      named_partners: asStringArray(record.named_partners),
      live_bids: asStringArray(record.live_bids),
      notes: asString(record.notes),
      evidence: asEvidence(record.evidence),
    });
  });

  if (!clients.length) {
    throw new Error('No usable clients were found in the register.');
  }

  return {
    register: {
      version: asNumber(source.version),
      updated: asString(source.updated),
      clients,
    },
    warnings,
  };
}

/* ------------------------------------------------------------------ */
/* Prefilter                                                           */
/* ------------------------------------------------------------------ */

export interface ScoredClient {
  client: ClientRecord;
  score: number;
  /** Why the prefilter liked them, carried into the model call as a hint. */
  reasons: string[];
}

/** Everything the coach has written about a client, for keyword scanning. */
function clientSearchText(client: ClientRecord): string {
  return [
    client.notes ?? '',
    client.trl_band ?? '',
    client.turnover_band ?? '',
    ...(client.grant_history ?? []),
    ...(client.named_partners ?? []),
    ...(client.live_bids ?? []),
    ...(client.evidence ?? []).map((item) => item.quote),
  ].join(' ');
}

/**
 * Tags the client actually carries, plus tags implied by what the coach wrote
 * about them. The second half matters: a register filled in by hand will have
 * notes long before it has tidy tags.
 */
export function effectiveTags(client: ClientRecord): { declared: string[]; inferred: string[] } {
  const declared = client.tech_tags ?? [];
  const inferred = tagsInText(clientSearchText(client), TECH_TAGS).filter((tag) => !declared.includes(tag));
  return { declared, inferred };
}

/** Distinctive words from the competition's themes, for free-text matching. */
function themeTerms(opportunity: OpportunityCard): string[] {
  const phrases = [
    ...opportunity.themes.flatMap((theme) => [theme.name, ...theme.sub_themes]),
    ...opportunity.tech_tags.map(labelForKey),
  ];

  const stopWords = new Set([
    'and', 'the', 'for', 'with', 'from', 'into', 'future', 'advanced', 'new', 'other',
    'innovation', 'technology', 'technologies', 'materials', 'material', 'systems', 'system',
  ]);

  const terms = new Set<string>();
  for (const phrase of phrases) {
    for (const word of phrase.toLowerCase().split(/[^a-z0-9]+/)) {
      if (word.length >= 5 && !stopWords.has(word)) terms.add(word);
    }
  }
  return Array.from(terms);
}

const BUSINESS_LED_PATTERN = /\b(business[- ]led|must be a business|sme|for[- ]profit)\b/i;

/**
 * Score every client against the opportunity without calling a model, and cut
 * the register down to the ones worth spending tokens on.
 *
 * Clients that score nothing are not silently dropped: they come back in
 * `skipped` with a reason, because a call sheet you cannot see the edges of is
 * a call sheet you cannot trust.
 */
export function shortlistClients(
  register: ClientRegister,
  opportunity: OpportunityCard,
  limit: number = DEFAULT_SHORTLIST_SIZE
): { shortlist: ScoredClient[]; skipped: ExcludedClient[] } {
  const terms = themeTerms(opportunity);
  const gateText = opportunity.hard_gates.map((gate) => gate.requirement).join(' ');
  const businessLed = BUSINESS_LED_PATTERN.test(`${gateText} ${opportunity.summary}`);
  const largeGrant = (opportunity.grant_min ?? 0) >= 250_000;

  const scored: ScoredClient[] = [];
  const skipped: ExcludedClient[] = [];

  for (const client of register.clients) {
    // The one exclusion worth making before the model sees anything: a
    // university or RTO cannot lead a business-led competition, and no amount
    // of thematic fit changes that.
    if (businessLed && client.is_business === false) {
      skipped.push({
        client_id: client.id,
        client_name: client.name,
        reason: 'Not a business, and this competition must be business-led.',
      });
      continue;
    }

    const reasons: string[] = [];

    // Topical relevance: what this client actually works on. Only this can put
    // a client on the shortlist. Sector overlap and the modifiers below can
    // move a relevant client up or down, but they must never make an
    // irrelevant one look relevant - the IS sectors are wide enough that "Life
    // Sciences" covers both an implant coating and care rostering software,
    // and being spoken to last week is not a reason to ring someone again.
    let topical = 0;

    const { declared, inferred } = effectiveTags(client);
    const declaredHits = declared.filter((tag) => opportunity.tech_tags.includes(tag));
    if (declaredHits.length) {
      topical += declaredHits.length * 5;
      reasons.push(`technology overlap: ${declaredHits.map(labelForKey).join(', ')}`);
    }
    const inferredHits = inferred.filter((tag) => opportunity.tech_tags.includes(tag));
    if (inferredHits.length) {
      topical += inferredHits.length * 3;
      reasons.push(`technology implied by the notes: ${inferredHits.map(labelForKey).join(', ')}`);
    }

    const haystack = clientSearchText(client).toLowerCase();
    const termHits = terms.filter((term) => haystack.includes(term));
    if (termHits.length) {
      topical += Math.min(termHits.length, 3) * 2;
      reasons.push(`the notes mention ${termHits.slice(0, 3).join(', ')}`);
    }

    if (topical < MIN_TOPICAL_SCORE) {
      skipped.push({
        client_id: client.id,
        client_name: client.name,
        reason: 'Nothing they work on overlaps the themes of this competition.',
      });
      continue;
    }

    let score = topical;

    const sectorHits = (client.sectors ?? []).filter((sector) => opportunity.sectors.includes(sector));
    if (sectorHits.length) {
      score += sectorHits.length * 2;
      reasons.push(`sector overlap: ${sectorHits.map(labelForKey).join(', ')}`);
    }

    if (client.grant_appetite === 'keen') {
      score += 2;
      reasons.push('keen on grant funding');
    } else if (client.grant_appetite === 'open') {
      score += 1;
    } else if (client.grant_appetite === 'reluctant') {
      score -= 3;
      reasons.push('has been reluctant about grants');
    }

    if (largeGrant) {
      if (client.match_funding_capacity === 'strong') {
        score += 2;
        reasons.push('can fund the match on a large project');
      } else if (client.match_funding_capacity === 'unlikely') {
        score -= 4;
        reasons.push('match funding looks out of reach at this grant size');
      }
    }

    if (client.live_bids?.length) {
      score -= 3;
      reasons.push(`already writing: ${client.live_bids.join(', ')}`);
    }

    const daysSinceContact = daysSince(client.last_contact);
    if (daysSinceContact !== null && daysSinceContact <= 180) {
      score += 2;
      reasons.push('spoken to recently');
    } else if (daysSinceContact !== null && daysSinceContact <= 365) {
      score += 1;
    }

    // A relevant client is never dropped here for being reluctant, skint or
    // busy. Those are things for the coach to weigh on the call, so they push
    // a client down the order and get reported, rather than disappearing them.
    scored.push({ client, score, reasons });
  }

  scored.sort((a, b) => b.score - a.score);

  const shortlist = scored.slice(0, limit);
  for (const dropped of scored.slice(limit)) {
    skipped.push({
      client_id: dropped.client.id,
      client_name: dropped.client.name,
      reason: `Scored below the top ${limit} on thematic fit.`,
    });
  }

  return { shortlist, skipped };
}

function daysSince(isoDate: string | undefined): number | null {
  if (!isoDate) return null;
  const date = new Date(isoDate);
  if (Number.isNaN(date.getTime())) return null;
  return Math.round((Date.now() - date.getTime()) / (24 * 60 * 60 * 1000));
}

/* ------------------------------------------------------------------ */
/* Prompt rendering                                                    */
/* ------------------------------------------------------------------ */

const MAX_QUOTE_LENGTH = 240;
const MAX_EVIDENCE_ITEMS = 6;

function truncate(text: string, max: number): string {
  return text.length <= max ? text : `${text.slice(0, max - 1).trimEnd()}...`;
}

/**
 * A client rendered for the model: everything it needs to test the gates and
 * quote the evidence, and nothing else.
 */
export function clientForPrompt(scored: ScoredClient): Record<string, unknown> {
  const { client } = scored;
  const { declared, inferred } = effectiveTags(client);

  const compact: Record<string, unknown> = {
    id: client.id,
    name: client.name,
    igs_owner: client.igs_owner ?? null,
    last_contact: client.last_contact ?? null,
    is_business: client.is_business ?? null,
    sme_status: client.sme_status ?? 'unknown',
    headcount: client.headcount ?? null,
    turnover_band: client.turnover_band ?? null,
    sectors: (client.sectors ?? []).map(labelForKey),
    technologies: [...declared, ...inferred].map(labelForKey),
    trl_band: client.trl_band ?? null,
    grant_history: client.grant_history ?? [],
    grant_appetite: client.grant_appetite ?? 'unknown',
    match_funding_capacity: client.match_funding_capacity ?? 'unknown',
    named_partners: client.named_partners ?? [],
    live_bids: client.live_bids ?? [],
    notes: client.notes ? truncate(client.notes, 600) : null,
    evidence: (client.evidence ?? []).slice(0, MAX_EVIDENCE_ITEMS).map((item) => ({
      quote: truncate(item.quote, MAX_QUOTE_LENGTH),
      meeting_date: item.meeting_date ?? null,
    })),
  };

  return compact;
}
