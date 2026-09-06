import { NextRequest, NextResponse } from 'next/server';
import { generateServiceWriteUp } from '../utils/openai-processor';
import { DEFAULT_WRITE_UP_PROMPTS, isServiceKey } from '@/lib/prompts';
import type { ServiceWriteUpResponse } from '@/lib/summary-types';

// One model call over the whole transcript; allow up to a minute on serverless hosts.
export const maxDuration = 60;

const DEFAULT_PARAMS = { temperature: 0.4, topP: 1, frequencyPenalty: 0, presencePenalty: 0 };

interface WriteUpRequestBody {
  service?: unknown;
  transcript?: unknown;
  prompt?: unknown;
  temperature?: unknown;
  top_p?: unknown;
  frequency_penalty?: unknown;
  presence_penalty?: unknown;
}

function readNumber(value: unknown, fallback: number, min: number, max: number): number {
  const parsed = typeof value === 'number' ? value : typeof value === 'string' && value.trim() ? Number(value) : NaN;
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(max, Math.max(min, parsed));
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as WriteUpRequestBody;

    if (!isServiceKey(body.service)) {
      return NextResponse.json({ detail: 'Unknown service' }, { status: 400 });
    }

    const transcript = typeof body.transcript === 'string' ? body.transcript : '';
    if (transcript.trim().length < 10) {
      return NextResponse.json({ detail: 'Transcript content is required' }, { status: 400 });
    }

    const promptText =
      typeof body.prompt === 'string' && body.prompt.trim() ? body.prompt.trim() : DEFAULT_WRITE_UP_PROMPTS[body.service];

    const params = {
      temperature: readNumber(body.temperature, DEFAULT_PARAMS.temperature, 0, 2),
      topP: readNumber(body.top_p, DEFAULT_PARAMS.topP, 0, 1),
      frequencyPenalty: readNumber(body.frequency_penalty, DEFAULT_PARAMS.frequencyPenalty, -2, 2),
      presencePenalty: readNumber(body.presence_penalty, DEFAULT_PARAMS.presencePenalty, -2, 2),
    };

    const { text, warnings } = await generateServiceWriteUp(transcript, promptText, params);
    if (!text) {
      return NextResponse.json({ detail: 'The AI returned an empty write-up. Please try again.' }, { status: 502 });
    }

    const result: ServiceWriteUpResponse = { service: body.service, text, warnings };
    return NextResponse.json(result);
  } catch (error) {
    console.error('Service write-up error:', error);
    const message = error instanceof Error ? error.message : 'Error generating the service write-up';
    return NextResponse.json({ detail: message }, { status: 500 });
  }
}
