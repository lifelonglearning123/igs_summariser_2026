import { OpenAI } from 'openai';
import { chunkText } from './file-processor';
import { SERVICES } from '@/lib/services';
import type { ServiceAssessment, ServiceAssessments, ServiceRelevance, SummaryResponse } from '@/lib/summary-types';

export const MODEL = 'gpt-4o';
const SYSTEM_PROMPT = 'You are the best business coach summary transcriber.';
const MAX_OUTPUT_TOKENS = 1500;

export interface GenerationParams {
  temperature: number;
  topP: number;
  frequencyPenalty: number;
  presencePenalty: number;
}

export interface SummaryPrompts {
  mainPoints: string;
  recommendations: string;
}

let cachedClient: OpenAI | null = null;

export function getOpenAIClient(): OpenAI {
  if (!cachedClient) {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      throw new Error('OPENAI_API_KEY is not configured');
    }
    cachedClient = new OpenAI({ apiKey });
  }
  return cachedClient;
}

/**
 * Single chat completion with the coach system prompt.
 */
export async function callOpenAI(
  prompt: string,
  params: GenerationParams,
  systemPrompt: string = SYSTEM_PROMPT
): Promise<string> {
  const openai = getOpenAIClient();
  const response = await openai.chat.completions.create({
    model: MODEL,
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: prompt },
    ],
    max_tokens: MAX_OUTPUT_TOKENS,
    temperature: params.temperature,
    top_p: params.topP,
    frequency_penalty: params.frequencyPenalty,
    presence_penalty: params.presencePenalty,
  });

  return response.choices[0]?.message?.content?.trim() || '';
}

/**
 * Run a prompt over every chunk of the transcript and join the outputs.
 */
export async function processChunks(
  transcript: string,
  promptText: string,
  params: GenerationParams
): Promise<{ text: string; chunkCount: number }> {
  const chunks = chunkText(transcript);
  const results: string[] = [];

  for (const chunk of chunks) {
    results.push(await callOpenAI(`${promptText}\n\n${chunk}`, params));
  }

  return { text: results.join('\n\n'), chunkCount: chunks.length };
}

/**
 * Light clean-up of model output: drop stray separator lines and excess blank lines.
 * Markdown itself is preserved so the client can render bold text and lists.
 */
function normalizeMarkdown(text: string): string {
  return text
    .replace(/\r\n?/g, '\n')
    .split('\n')
    .filter((line) => !/^\s*\+\s*$/.test(line))
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

/* ------------------------------------------------------------------ */
/* Service classification                                              */
/* ------------------------------------------------------------------ */

const RELEVANCE_LEVELS: ServiceRelevance[] = ['discussed', 'mentioned', 'not_discussed'];

const ASSESSMENT_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['relevance', 'reason', 'evidence'],
  properties: {
    relevance: { type: 'string', enum: RELEVANCE_LEVELS },
    reason: {
      type: 'string',
      description: 'One plain-English sentence for the coach saying what was said about this support, or that it did not come up.',
    },
    evidence: {
      type: 'string',
      description:
        'One continuous verbatim quote of under 25 words from the transcript, copied exactly with no ellipses. Empty string when the support was not discussed.',
    },
  },
};

const SERVICES_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: SERVICES.map((service) => service.key),
  properties: Object.fromEntries(SERVICES.map((service) => [service.key, ASSESSMENT_SCHEMA])),
};

function buildClassificationPrompt(transcript: string): string {
  const serviceList = SERVICES.map((service, index) => `${index + 1}. ${service.label}: ${service.guidance}`).join('\n');
  return [
    'You read a business coaching meeting transcript and decide, for each Salesforce support an Innovation and Growth Specialist (IGS) can record a meeting against, how far this meeting covered it.',
    '',
    'For each support choose one:',
    "- discussed: the meeting spent real time on it. The coach gave advice on it, explored the client's fit or eligibility, worked on an application, or agreed next steps for it.",
    '- mentioned: it came up in passing or was signposted without being worked on.',
    '- not_discussed: the transcript does not cover it.',
    '',
    "Judge what was said in the meeting, not what the client might benefit from. Never infer a person's gender, ethnicity or other personal characteristics from their name or voice.",
    '',
    'Supports:',
    serviceList,
    '',
    'Transcript:',
    transcript,
  ].join('\n');
}

function isAssessment(value: unknown): value is ServiceAssessment {
  const candidate = value as ServiceAssessment;
  return (
    typeof value === 'object' &&
    value !== null &&
    RELEVANCE_LEVELS.includes(candidate.relevance) &&
    typeof candidate.reason === 'string' &&
    typeof candidate.evidence === 'string'
  );
}

/** Lower-case and reduce to letters, digits and single spaces, so a quote survives punctuation and line-break differences. */
function normaliseForMatch(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9£$€%]+/g, ' ')
    .trim();
}

/** Keep the model's quote only if it really is in the transcript: a made-up quote is worse than none. */
function verifiedQuote(quote: string, normalisedTranscript: string): string {
  const needle = normaliseForMatch(quote);
  return needle.length >= 8 && normalisedTranscript.includes(needle) ? quote.trim() : '';
}

/** The sentence around a match, cut to the words either side of it when the sentence runs on. */
function quoteAround(transcript: string, match: RegExpExecArray): string {
  const matchEnd = match.index + match[0].length;
  const start = transcript.slice(0, match.index).search(/[^.!?\n]*$/);
  const endOffset = transcript.slice(matchEnd).search(/[.!?\n]/);
  const end = endOffset === -1 ? transcript.length : matchEnd + endOffset + 1;

  const words = transcript.slice(start, end).trim().split(/\s+/);
  if (words.length <= 30) return words.join(' ');

  const matchWord = transcript.slice(start, match.index).trim().split(/\s+/).filter(Boolean).length;
  const from = Math.max(0, matchWord - 12);
  const to = Math.min(words.length, matchWord + 13);
  return `${from > 0 ? '… ' : ''}${words.slice(from, to).join(' ')}${to < words.length ? ' …' : ''}`;
}

/**
 * Ask the model how far the meeting covered each Salesforce support. A support
 * named outright in the transcript (GBIP, Women in Innovation...) is never
 * left as "not discussed": the model may miss a name, so it is raised to
 * "mentioned" and shown with the sentence it appears in, for the coach to judge.
 */
export async function assessServices(transcript: string): Promise<ServiceAssessments> {
  const openai = getOpenAIClient();
  const [firstChunk] = chunkText(transcript);

  const response = await openai.chat.completions.create({
    model: MODEL,
    messages: [
      { role: 'system', content: 'You are a precise classifier. Answer only with the requested JSON.' },
      { role: 'user', content: buildClassificationPrompt(firstChunk ?? transcript) },
    ],
    temperature: 0,
    max_tokens: 3000,
    response_format: {
      type: 'json_schema',
      json_schema: { name: 'service_assessment', strict: true, schema: SERVICES_SCHEMA },
    },
  });

  const raw = response.choices[0]?.message?.content;
  if (!raw) {
    throw new Error('Empty classification response');
  }

  const parsed = JSON.parse(raw) as Record<string, unknown>;
  const normalisedTranscript = normaliseForMatch(transcript);
  const assessments = {} as ServiceAssessments;

  for (const service of SERVICES) {
    const value = parsed[service.key];
    if (!isAssessment(value)) {
      throw new Error(`Classification response missing "${service.key}"`);
    }

    const assessment: ServiceAssessment = {
      relevance: value.relevance,
      reason: value.reason,
      evidence: value.relevance === 'not_discussed' ? '' : verifiedQuote(value.evidence, normalisedTranscript),
    };

    const named = service.namedBy?.exec(transcript);
    if (named) {
      if (assessment.relevance === 'not_discussed') {
        assessment.relevance = 'mentioned';
        assessment.reason = `${service.shortLabel} is named in the transcript.`;
      }
      assessment.evidence = assessment.evidence || quoteAround(transcript, named);
    }

    assessments[service.key] = assessment;
  }

  return assessments;
}

/* ------------------------------------------------------------------ */
/* Orchestration                                                       */
/* ------------------------------------------------------------------ */

/**
 * Generate both summary sections and the service assessment. The three model
 * calls run in parallel; a classification failure does not fail the summary.
 */
export async function generateSummary(
  transcript: string,
  prompts: SummaryPrompts,
  params: GenerationParams
): Promise<SummaryResponse> {
  const [mainPoints, recommendations, services] = await Promise.all([
    processChunks(transcript, prompts.mainPoints, params),
    processChunks(transcript, prompts.recommendations, params),
    assessServices(transcript).catch((error) => {
      console.error('Service classification failed:', error);
      return null;
    }),
  ]);

  const warnings: string[] = [];
  if (mainPoints.chunkCount > 1) {
    warnings.push(
      `The transcript was long, so it was processed in ${mainPoints.chunkCount} parts and the sections were combined.`
    );
  }
  if (!services) {
    warnings.push('Salesforce support suggestions could not be generated for this transcript. Please tick the supports manually.');
  }

  return {
    main_points: normalizeMarkdown(mainPoints.text),
    recommendations: normalizeMarkdown(recommendations.text),
    services,
    transcript,
    warnings,
  };
}

/* ------------------------------------------------------------------ */
/* Per-service write-ups                                               */
/* ------------------------------------------------------------------ */

const WRITE_UP_SYSTEM_PROMPT =
  'You are an Innovation and Growth Specialist writing up a client meeting for your organisation\'s CRM. You are accurate, concise and never invent detail that is not in the transcript.';

/**
 * Produce the Salesforce write-up for one service. Unlike the summary sections
 * this is a single call over the transcript: a write-up joined from several
 * chunks would repeat its headings, so a very long transcript is truncated to
 * the first chunk and the caller is warned.
 */
export async function generateServiceWriteUp(
  transcript: string,
  promptText: string,
  params: GenerationParams
): Promise<{ text: string; warnings: string[] }> {
  const chunks = chunkText(transcript);
  const text = await callOpenAI(
    `${promptText}\n\nTranscript:\n${chunks[0] ?? transcript}`,
    params,
    WRITE_UP_SYSTEM_PROMPT
  );

  const warnings: string[] = [];
  if (chunks.length > 1) {
    warnings.push('The transcript was too long to write up in one pass, so this covers the first part of it only.');
  }

  return { text: normalizeMarkdown(text), warnings };
}
