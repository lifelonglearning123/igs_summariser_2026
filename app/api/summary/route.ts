import { NextRequest, NextResponse } from 'next/server';
import { isSupportedFileName, readFileContent } from '../utils/file-processor';
import { generateSummary } from '../utils/openai-processor';
import { DEFAULT_MAIN_POINTS_PROMPT, DEFAULT_RECOMMENDATIONS_PROMPT } from '@/lib/prompts';

// Three model calls run in parallel; allow up to a minute on serverless hosts.
export const maxDuration = 60;

const DEFAULT_PARAMS = { temperature: 0.5, topP: 1, frequencyPenalty: 0, presencePenalty: 0 };

function readNumber(formData: FormData, key: string, fallback: number, min: number, max: number): number {
  const raw = formData.get(key);
  const value = typeof raw === 'string' && raw.trim() !== '' ? Number(raw) : NaN;
  if (!Number.isFinite(value)) return fallback;
  return Math.min(max, Math.max(min, value));
}

function readPrompt(formData: FormData, key: string, fallback: string): string {
  const raw = formData.get(key);
  return typeof raw === 'string' && raw.trim() ? raw.trim() : fallback;
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file');
    const transcript = formData.get('transcript');

    const params = {
      temperature: readNumber(formData, 'temperature', DEFAULT_PARAMS.temperature, 0, 2),
      topP: readNumber(formData, 'top_p', DEFAULT_PARAMS.topP, 0, 1),
      frequencyPenalty: readNumber(formData, 'frequency_penalty', DEFAULT_PARAMS.frequencyPenalty, -2, 2),
      presencePenalty: readNumber(formData, 'presence_penalty', DEFAULT_PARAMS.presencePenalty, -2, 2),
    };

    const prompts = {
      mainPoints: readPrompt(formData, 'main_points_prompt', DEFAULT_MAIN_POINTS_PROMPT),
      recommendations: readPrompt(formData, 'recommendations_prompt', DEFAULT_RECOMMENDATIONS_PROMPT),
    };

    let content: string;
    if (file instanceof File && file.size > 0) {
      if (!isSupportedFileName(file.name)) {
        return NextResponse.json(
          { detail: 'Unsupported file type. Please upload a .txt or .docx file.' },
          { status: 400 }
        );
      }
      content = await readFileContent(file);
    } else if (typeof transcript === 'string' && transcript.trim()) {
      content = transcript;
    } else {
      return NextResponse.json(
        { detail: 'Either file or transcript content is required' },
        { status: 400 }
      );
    }

    if (content.trim().length < 10) {
      return NextResponse.json({ detail: 'Transcript content is too short' }, { status: 400 });
    }

    const result = await generateSummary(content, prompts, params);
    return NextResponse.json(result);
  } catch (error) {
    console.error('Summary processing error:', error);
    const message = error instanceof Error ? error.message : 'Error processing summary';
    return NextResponse.json({ detail: message }, { status: 500 });
  }
}
