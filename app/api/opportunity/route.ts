import { NextRequest, NextResponse } from 'next/server';
import { parseOpportunity } from '../utils/opportunity-processor';
import { DEFAULT_OPPORTUNITY_PROMPT } from '@/lib/opportunity-prompts';
import { computeTiming } from '@/lib/opportunity-timing';
import type { OpportunityParseResponse } from '@/lib/opportunity-types';

// One model call over a single email.
export const runtime = 'nodejs';

interface OpportunityRequestBody {
  email?: unknown;
  prompt?: unknown;
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as OpportunityRequestBody;

    const email = typeof body.email === 'string' ? body.email : '';
    if (email.trim().length < 40) {
      return NextResponse.json(
        { detail: 'Paste the funding email. There is not enough text here to read.' },
        { status: 400 }
      );
    }

    const promptText =
      typeof body.prompt === 'string' && body.prompt.trim() ? body.prompt.trim() : DEFAULT_OPPORTUNITY_PROMPT;

    const opportunity = await parseOpportunity(email, promptText);
    const timing = computeTiming(opportunity);

    const warnings = [...opportunity.warnings];
    if (!opportunity.actionable) {
      warnings.push('This email does not look like a competition a client could apply to, so there is nothing to match clients against.');
    }
    if (opportunity.actionable && !opportunity.closing_date) {
      warnings.push('No closing date was found, so the decide-by date could not be worked out.');
    }

    const result: OpportunityParseResponse = { opportunity, timing, warnings };
    return NextResponse.json(result);
  } catch (error) {
    console.error('Opportunity parse error:', error);
    const message = error instanceof Error ? error.message : 'Error reading this email';
    return NextResponse.json({ detail: message }, { status: 500 });
  }
}
