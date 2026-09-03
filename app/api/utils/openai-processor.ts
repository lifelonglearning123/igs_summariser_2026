import { OpenAI } from 'openai';
import { chunkText } from './file-processor';
import { GBIP_TRIGGER_PATTERN, SERVICES } from '@/lib/prompts';
import type { ServiceAssessment, ServiceAssessments, SummaryResponse } from '@/lib/summary-types';

const MODEL = 'gpt-4o';
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

function getOpenAIClient(): OpenAI {
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
export async function callOpenAI(prompt: string, params: GenerationParams): Promise<string> {
  const openai = getOpenAIClient();
  const response = await openai.chat.completions.create({
    model: MODEL,
    messages: [
      { role: 'system', content: SYSTEM_PROMPT },
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

const ASSESSMENT_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['covered', 'reason'],
  properties: {
    covered: { type: 'boolean' },
    reason: {
      type: 'string',
      description: 'One sentence citing the evidence in the transcript, or explaining why the service was not covered.',
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
    'You classify business coaching meeting transcripts against the services an Innovation and Growth Specialist (IGS) can record the meeting under.',
    'For each service decide whether this meeting covered it, and give a one-sentence reason that cites the evidence from the transcript.',
    '',
    'Services:',
    serviceList,
    '',
    'Transcript:',
    transcript,
  ].join('\n');
}

function isAssessment(value: unknown): value is ServiceAssessment {
  return (
    typeof value === 'object' &&
    value !== null &&
    typeof (value as ServiceAssessment).covered === 'boolean' &&
    typeof (value as ServiceAssessment).reason === 'string'
  );
}

/**
 * Ask the model which services the meeting covered. GBIP is additionally
 * forced on when the transcript contains the GBIP / GIP trigger words.
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
    max_tokens: 600,
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
  const assessments = {} as ServiceAssessments;
  for (const service of SERVICES) {
    const value = parsed[service.key];
    if (!isAssessment(value)) {
      throw new Error(`Classification response missing "${service.key}"`);
    }
    assessments[service.key] = value;
  }

  const trigger = GBIP_TRIGGER_PATTERN.exec(transcript);
  if (trigger) {
    assessments.gbip = {
      covered: true,
      reason: assessments.gbip.covered
        ? assessments.gbip.reason
        : `The transcript mentions "${trigger[0].trim()}" directly.`,
    };
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
    warnings.push('Service suggestions could not be generated for this transcript. Please select the services manually.');
  }

  return {
    main_points: normalizeMarkdown(mainPoints.text),
    recommendations: normalizeMarkdown(recommendations.text),
    services,
    warnings,
  };
}
