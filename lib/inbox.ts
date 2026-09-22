/**
 * Turning a pile of emails into a sorted list of opportunities.
 *
 * Two things happen here, and both are the difference between an inbox and a
 * worklist.
 *
 * De-duplication, because the same competition arrives three times: once from
 * the funder, once forwarded by a colleague, once in a round-up newsletter a
 * fortnight later. Those are one thing to act on, not three, and the coach
 * should see the one item with all three sources against it.
 *
 * Sorting by the decide-by date rather than by arrival. An email that landed
 * this morning about a competition closing in April matters less than one from
 * last week that needs a decision on Friday, and only the derived date knows
 * that.
 */

import type { InboxItem, OpportunityCard, Urgency } from './opportunity-types';

/* ------------------------------------------------------------------ */
/* Identity                                                            */
/* ------------------------------------------------------------------ */

/**
 * Pull a stable competition id out of an application URL.
 *
 * Innovate UK's service puts the competition number in the path, which is the
 * most reliable identity there is: the same competition linked from two
 * different emails gives the same number even when the covering text differs
 * completely.
 */
function competitionIdFromUrl(url: string | null): string | null {
  if (!url) return null;

  const iuk = /competition\/(\d+)/i.exec(url);
  if (iuk) return `iuk:${iuk[1]}`;

  try {
    const parsed = new URL(url.startsWith('http') ? url : `https://${url}`);
    const path = parsed.pathname.replace(/\/+$/, '');
    if (!path || path === '/') return null;
    return `url:${parsed.hostname.replace(/^www\./, '')}${path}`.toLowerCase();
  } catch {
    return null;
  }
}

function slug(text: string): string {
  return text
    .toLowerCase()
    .replace(/\b(the|a|an|of|for|and|programme|program|competition|round|call|fund|funding)\b/g, ' ')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

/**
 * Identify the competition an email is about.
 *
 * The URL wins when there is one. Otherwise a competition is taken to be the
 * same when the funder, the closing date and the rough name agree - three
 * things that a reminder about a call will repeat and that two genuinely
 * different calls will not all share.
 */
export function fingerprintOpportunity(card: OpportunityCard, fallback: string): string {
  const fromUrl = competitionIdFromUrl(card.url);
  if (fromUrl) return fromUrl;

  const parts = [card.funder, card.closing_date, card.name ? slug(card.name) : null].filter(Boolean);

  // Two of the three is not enough to merge on: a funder and a closing date
  // alone would collapse two unrelated calls that happen to close together.
  if (parts.length >= 3) return `meta:${parts.join('|')}`.toLowerCase();

  return `email:${fallback}`;
}

/* ------------------------------------------------------------------ */
/* Merging                                                             */
/* ------------------------------------------------------------------ */

/** How much a card actually tells you, for picking the best of several. */
function detailScore(card: OpportunityCard): number {
  return (
    card.hard_gates.length * 2 +
    card.themes.length * 2 +
    card.soft_signals.length +
    card.support_dates.length +
    (card.closing_date ? 3 : 0) +
    (card.grant_max ? 2 : 0) +
    (card.scored_questions ? 2 : 0) +
    (card.url ? 2 : 0)
  );
}

function sourceKey(source: { from: string | null; subject: string | null; received_at: string | null }): string {
  return `${source.from ?? ''}|${source.subject ?? ''}|${source.received_at ?? ''}`;
}

/** Fold two items for the same competition into one, keeping every source. */
function mergeTwo(a: InboxItem, b: InboxItem): InboxItem {
  const keepB = detailScore(b.opportunity) > detailScore(a.opportunity);
  const winner = keepB ? b : a;
  const loser = keepB ? a : b;

  const seen = new Set(winner.sources.map(sourceKey));
  const sources = [...winner.sources];
  for (const source of loser.sources) {
    if (!seen.has(sourceKey(source))) {
      seen.add(sourceKey(source));
      sources.push(source);
    }
  }

  return {
    ...winner,
    sources: sources.sort(byReceivedDesc),
    warnings: Array.from(new Set([...winner.warnings, ...loser.warnings])),
  };
}

/**
 * The competition's name, normalised, when it is distinctive enough to be an
 * identity on its own. Short names are refused: "Smart Grant" alone should not
 * pull two unrelated items together.
 */
function nameKey(item: InboxItem): string | null {
  const name = item.opportunity.name;
  if (!name || !item.opportunity.actionable) return null;
  const key = slug(name);
  return key.length >= 12 ? key : null;
}

/** Two stated closing dates that disagree mean two different competitions. */
function datesConflict(a: string | null, b: string | null): boolean {
  return a !== null && b !== null && a !== b;
}

/**
 * Collapse items that describe the same competition.
 *
 * Two passes, because one is not enough in practice. The first matches on the
 * fingerprint, which is the competition URL where there is one. The second
 * catches what that misses: the same call arriving in a funder's own briefing
 * and again in a weekly digest, where one names the funder "Innovate UK" and
 * the other "UK Research and Innovation" and only one carries the link. Those
 * are matched on the competition name instead, and only when their closing
 * dates do not contradict each other.
 *
 * The fullest card wins rather than the newest: a digest that mentions a
 * deadline in passing should not overwrite the briefing that listed every
 * eligibility rule. All the emails stay attached as sources.
 */
export function dedupeItems(items: InboxItem[]): { items: InboxItem[]; merged: number } {
  const byId = new Map<string, InboxItem>();
  let merged = 0;

  for (const item of items) {
    const existing = byId.get(item.id);
    if (!existing) {
      byId.set(item.id, item);
      continue;
    }
    merged += 1;
    byId.set(item.id, mergeTwo(existing, item));
  }

  const byName = new Map<string, string>();
  const result = new Map<string, InboxItem>();

  for (const item of Array.from(byId.values())) {
    const key = nameKey(item);
    const twinId = key ? byName.get(key) : undefined;
    const twin = twinId ? result.get(twinId) : undefined;

    if (!twin || datesConflict(twin.opportunity.closing_date, item.opportunity.closing_date)) {
      result.set(item.id, item);
      if (key && !byName.has(key)) byName.set(key, item.id);
      continue;
    }

    merged += 1;
    // The first-seen id stays canonical: it is what call sheets are filed
    // under, so it must not change when a later email merges in.
    result.set(twinId as string, { ...mergeTwo(twin, item), id: twinId as string });
  }

  return { items: Array.from(result.values()), merged };
}

function byReceivedDesc(
  a: { received_at: string | null },
  b: { received_at: string | null }
): number {
  const left = a.received_at ? Date.parse(a.received_at) : 0;
  const right = b.received_at ? Date.parse(b.received_at) : 0;
  return right - left;
}

/* ------------------------------------------------------------------ */
/* Sorting                                                             */
/* ------------------------------------------------------------------ */

const URGENCY_RANK: Record<Urgency, number> = {
  critical: 0,
  tight: 1,
  comfortable: 2,
  unknown: 3,
  closed: 4,
};

/** True for the round-ups, webinars and admin that are not worth a call sheet. */
export function isNoise(item: InboxItem): boolean {
  return !item.opportunity.actionable;
}

/**
 * Sort into the order a coach should work through: the things that need
 * deciding soonest, first. Anything already closed drops to the bottom of the
 * actionable list rather than off it, because a coach still wants to know a
 * competition they were asked about has gone.
 */
export function sortItems(items: InboxItem[]): InboxItem[] {
  return [...items].sort((a, b) => {
    const noise = Number(isNoise(a)) - Number(isNoise(b));
    if (noise !== 0) return noise;

    const urgency = URGENCY_RANK[a.timing.urgency] - URGENCY_RANK[b.timing.urgency];
    if (urgency !== 0) return urgency;

    const left = a.timing.days_to_decide;
    const right = b.timing.days_to_decide;
    if (left !== null && right !== null && left !== right) return left - right;
    if (left !== null && right === null) return -1;
    if (left === null && right !== null) return 1;

    return byReceivedDesc(
      a.sources[0] ?? { received_at: null },
      b.sources[0] ?? { received_at: null }
    );
  });
}

/** One line for the top of the inbox: what needs doing now. */
export function inboxHeadline(items: InboxItem[]): string {
  const live = items.filter((item) => !isNoise(item) && item.timing.urgency !== 'closed');
  if (!live.length) return 'Nothing here needs a decision.';

  const critical = live.filter((item) => item.timing.urgency === 'critical').length;
  const opportunities = `${live.length} opportunit${live.length === 1 ? 'y' : 'ies'}`;

  if (!critical) return `${opportunities}, none urgent.`;
  return `${opportunities}, ${critical} needing a decision now.`;
}
