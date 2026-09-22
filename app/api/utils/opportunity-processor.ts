/**
 * The two model calls behind the call sheet.
 *
 * Both use structured outputs rather than free text, because everything
 * downstream - the decide-by arithmetic, the prefilter, the gate table - needs
 * fields it can rely on rather than markdown it has to parse back.
 */

import { getOpenAIClient, MODEL } from './openai-processor';
import { chunkText } from './file-processor';
import { IS_SECTOR_KEYS, IS_SECTORS, tagsInText, TECH_TAG_KEYS, TECH_TAGS } from '@/lib/taxonomy';
import { buildMatchPrompt } from '@/lib/opportunity-prompts';
import type { ClientMatch, OpportunityCard, OpportunityTiming } from '@/lib/opportunity-types';

const PARSE_SYSTEM_PROMPT =
  'You extract structured records from funding emails. You are literal and precise, you never invent a date, a figure or a rule, and you answer only with the requested JSON.';

const MATCH_SYSTEM_PROMPT =
  'You match business clients to funding competitions for an Innovation and Growth Specialist. You are conservative: you never turn a gap in a client record into a claim, and you answer only with the requested JSON.';

/* ------------------------------------------------------------------ */
/* Schemas                                                             */
/* ------------------------------------------------------------------ */

const OPPORTUNITY_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: [
    'type', 'actionable', 'funder', 'name', 'url', 'summary',
    'closing_date', 'project_start', 'project_window',
    'grant_min', 'grant_max', 'total_pot',
    'hard_gates', 'themes', 'soft_signals',
    'sectors', 'tech_tags', 'support_dates',
    'scored_questions', 'word_limit', 'review_lead_days', 'warnings',
  ],
  properties: {
    type: { type: 'string', enum: ['competition', 'event', 'reminder', 'newsletter', 'admin', 'other'] },
    actionable: { type: 'boolean' },
    funder: { type: ['string', 'null'] },
    name: { type: ['string', 'null'] },
    url: { type: ['string', 'null'] },
    summary: { type: 'string' },
    closing_date: { type: ['string', 'null'], description: 'YYYY-MM-DD' },
    project_start: { type: ['string', 'null'], description: 'YYYY-MM-DD' },
    project_window: { type: ['string', 'null'], description: 'Project duration as the email states it.' },
    grant_min: { type: ['number', 'null'] },
    grant_max: { type: ['number', 'null'] },
    total_pot: { type: ['number', 'null'] },
    hard_gates: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['id', 'requirement', 'severity'],
        properties: {
          id: { type: 'string' },
          requirement: { type: 'string' },
          severity: { type: 'string', enum: ['hard', 'soft'] },
        },
      },
    },
    themes: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['name', 'sub_themes'],
        properties: {
          name: { type: 'string' },
          sub_themes: { type: 'array', items: { type: 'string' } },
        },
      },
    },
    soft_signals: { type: 'array', items: { type: 'string' } },
    sectors: { type: 'array', items: { type: 'string', enum: IS_SECTOR_KEYS } },
    tech_tags: { type: 'array', items: { type: 'string', enum: TECH_TAG_KEYS } },
    support_dates: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['label', 'date', 'note'],
        properties: {
          label: { type: 'string' },
          date: { type: ['string', 'null'], description: 'YYYY-MM-DD' },
          note: { type: ['string', 'null'] },
        },
      },
    },
    scored_questions: { type: ['number', 'null'] },
    word_limit: { type: ['number', 'null'] },
    review_lead_days: { type: ['number', 'null'] },
    warnings: { type: 'array', items: { type: 'string' } },
  },
};

const MATCH_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['matches'],
  properties: {
    matches: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['client_id', 'verdict', 'score', 'why', 'evidence', 'gates', 'questions_to_ask', 'gaps', 'opening_line'],
        properties: {
          client_id: { type: 'string' },
          verdict: { type: 'string', enum: ['strong', 'possible', 'long_shot', 'excluded'] },
          score: { type: 'number' },
          why: { type: 'string' },
          evidence: {
            type: 'array',
            items: {
              type: 'object',
              additionalProperties: false,
              required: ['quote', 'meeting_date'],
              properties: {
                quote: { type: 'string' },
                meeting_date: { type: ['string', 'null'] },
              },
            },
          },
          gates: {
            type: 'array',
            items: {
              type: 'object',
              additionalProperties: false,
              required: ['gate_id', 'requirement', 'verdict', 'note'],
              properties: {
                gate_id: { type: 'string' },
                requirement: { type: 'string' },
                verdict: { type: 'string', enum: ['pass', 'fail', 'unknown'] },
                note: { type: 'string' },
              },
            },
          },
          questions_to_ask: { type: 'array', items: { type: 'string' } },
          gaps: { type: 'array', items: { type: 'string' } },
          opening_line: { type: 'string' },
        },
      },
    },
  },
};

/* ------------------------------------------------------------------ */
/* Parsing the email                                                   */
/* ------------------------------------------------------------------ */

function emptyCard(summary: string): OpportunityCard {
  return {
    type: 'other',
    actionable: false,
    funder: null,
    name: null,
    url: null,
    summary,
    closing_date: null,
    project_start: null,
    project_window: null,
    grant_min: null,
    grant_max: null,
    total_pot: null,
    hard_gates: [],
    themes: [],
    soft_signals: [],
    sectors: [],
    tech_tags: [],
    support_dates: [],
    scored_questions: null,
    word_limit: null,
    review_lead_days: null,
    warnings: [],
  };
}

/**
 * Read one email into an opportunity card. Long forwarded threads are cut to
 * the first chunk: the competition detail is always at the top, and the tail
 * is signature blocks and quoted history.
 */
export async function parseOpportunity(emailText: string, promptText: string): Promise<OpportunityCard> {
  const openai = getOpenAIClient();
  const [firstChunk] = chunkText(emailText);

  const response = await openai.chat.completions.create({
    model: MODEL,
    messages: [
      { role: 'system', content: PARSE_SYSTEM_PROMPT },
      { role: 'user', content: `${promptText}\n\nEMAIL\n${firstChunk ?? emailText}` },
    ],
    temperature: 0,
    max_tokens: 2500,
    response_format: {
      type: 'json_schema',
      json_schema: { name: 'opportunity', strict: true, schema: OPPORTUNITY_SCHEMA },
    },
  });

  const raw = response.choices[0]?.message?.content;
  if (!raw) throw new Error('The AI returned an empty response for this email.');

  const parsed = JSON.parse(raw) as Partial<OpportunityCard>;
  const card = { ...emptyCard(parsed.summary ?? 'No summary returned.'), ...parsed } as OpportunityCard;

  // Normalise the fields the rest of the pipeline indexes into, so a missing
  // array from the model cannot crash the prefilter.
  card.hard_gates = Array.isArray(card.hard_gates) ? card.hard_gates : [];
  card.themes = Array.isArray(card.themes) ? card.themes : [];
  card.soft_signals = Array.isArray(card.soft_signals) ? card.soft_signals : [];
  card.sectors = Array.isArray(card.sectors) ? card.sectors : [];
  card.tech_tags = Array.isArray(card.tech_tags) ? card.tech_tags : [];
  card.support_dates = Array.isArray(card.support_dates) ? card.support_dates : [];
  card.warnings = Array.isArray(card.warnings) ? card.warnings : [];

  if (chunkText(emailText).length > 1) {
    card.warnings.push('The email was long, so only the first part of it was read.');
  }

  return augmentTags(card);
}

/**
 * Widen the card's tags from its own theme wording.
 *
 * The model tags conservatively, which is right for dates and figures and
 * wrong here: asked to tag a materials competition it returned the four
 * technologies named most explicitly and left off advanced materials and
 * surface engineering, which are what the themes are actually about. The
 * prefilter runs on these tags, so a thin list quietly drops the very clients
 * the competition was written for.
 *
 * So the themes, summary and soft signals are swept for taxonomy terms and
 * unioned in. Only that text, not the whole email: sweeping the footer would
 * tag every competition with whatever the sender's company does.
 */
function augmentTags(card: OpportunityCard): OpportunityCard {
  const themeText = [
    card.name ?? '',
    card.summary,
    ...card.themes.flatMap((theme) => [theme.name, ...theme.sub_themes]),
    ...card.soft_signals,
  ].join('. ');

  const union = (existing: string[], found: string[]) =>
    Array.from(new Set([...existing, ...found]));

  card.sectors = union(card.sectors, tagsInText(themeText, IS_SECTORS));
  card.tech_tags = union(card.tech_tags, tagsInText(themeText, TECH_TAGS));

  return card;
}

/* ------------------------------------------------------------------ */
/* Matching the shortlist                                              */
/* ------------------------------------------------------------------ */

interface RawMatch {
  client_id: string;
  verdict: ClientMatch['verdict'];
  score: number;
  why: string;
  evidence: { quote: string; meeting_date: string | null }[];
  gates: ClientMatch['gates'];
  questions_to_ask: string[];
  gaps: string[];
  opening_line: string;
}

export interface MatchModelResult {
  matches: RawMatch[];
}

/**
 * Rank the shortlist against the competition in a single call. One call rather
 * than one per client: the model ranks better when it can see the field, and
 * it costs a fraction as much.
 */
export async function matchClients(
  promptText: string,
  opportunity: OpportunityCard,
  timing: OpportunityTiming,
  clients: Record<string, unknown>[]
): Promise<MatchModelResult> {
  const openai = getOpenAIClient();

  const response = await openai.chat.completions.create({
    model: MODEL,
    messages: [
      { role: 'system', content: MATCH_SYSTEM_PROMPT },
      { role: 'user', content: buildMatchPrompt(promptText, opportunity, timing, clients) },
    ],
    temperature: 0.2,
    max_tokens: 6000,
    response_format: {
      type: 'json_schema',
      json_schema: { name: 'client_matches', strict: true, schema: MATCH_SCHEMA },
    },
  });

  const raw = response.choices[0]?.message?.content;
  if (!raw) throw new Error('The AI returned an empty response when matching clients.');

  const parsed = JSON.parse(raw) as Partial<MatchModelResult>;
  return { matches: Array.isArray(parsed.matches) ? parsed.matches : [] };
}

