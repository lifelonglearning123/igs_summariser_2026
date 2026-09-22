import { NextRequest, NextResponse } from 'next/server';
import { matchClients } from '../utils/opportunity-processor';
import { clientForPrompt, DEFAULT_SHORTLIST_SIZE, parseRegister, shortlistClients } from '@/lib/client-register';
import { DEFAULT_MATCH_PROMPT } from '@/lib/opportunity-prompts';
import { computeTiming } from '@/lib/opportunity-timing';
import type {
  CallSheet,
  ClientMatch,
  ClientRegister,
  ExcludedClient,
  MatchVerdict,
  OpportunityCard,
} from '@/lib/opportunity-types';

// One model call over the shortlist.
export const runtime = 'nodejs';

/** How many ruled-out clients come back with the call sheet. */
const MAX_EXCLUSIONS_RETURNED = 25;

const VERDICT_RANK: Record<MatchVerdict, number> = {
  strong: 0,
  possible: 1,
  long_shot: 2,
  excluded: 3,
};

interface MatchRequestBody {
  opportunity?: unknown;
  register?: unknown;
  prompt?: unknown;
  shortlist_size?: unknown;
}

function isOpportunityCard(value: unknown): value is OpportunityCard {
  return typeof value === 'object' && value !== null && typeof (value as OpportunityCard).summary === 'string';
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as MatchRequestBody;

    if (!isOpportunityCard(body.opportunity)) {
      return NextResponse.json({ detail: 'Read the funding email first.' }, { status: 400 });
    }
    const opportunity = body.opportunity;

    let register: ClientRegister;
    let registerWarnings: string[];
    try {
      const parsed = parseRegister(body.register);
      register = parsed.register;
      registerWarnings = parsed.warnings;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'The client register could not be read.';
      return NextResponse.json({ detail: message }, { status: 400 });
    }

    const shortlistSize =
      typeof body.shortlist_size === 'number' && body.shortlist_size > 0
        ? Math.min(Math.floor(body.shortlist_size), 60)
        : DEFAULT_SHORTLIST_SIZE;

    // Recomputed here rather than trusted from the browser: the decide-by date
    // is the thing a coach acts on, so it is worked out on the server from the
    // card itself every time.
    const timing = computeTiming(opportunity);
    const { shortlist, skipped } = shortlistClients(register, opportunity, shortlistSize);

    const warnings = [...registerWarnings];

    if (!shortlist.length) {
      return NextResponse.json({
        opportunity,
        timing,
        matches: [],
        excluded: skipped.slice(0, MAX_EXCLUSIONS_RETURNED),
        shortlisted: 0,
        register_size: register.clients.length,
        warnings: [
          ...warnings,
          `No client in the register overlaps this competition. All ${register.clients.length} were ruled out before the AI was asked.`,
        ],
      } satisfies CallSheet);
    }

    const promptText =
      typeof body.prompt === 'string' && body.prompt.trim() ? body.prompt.trim() : DEFAULT_MATCH_PROMPT;

    const result = await matchClients(
      promptText,
      opportunity,
      timing,
      shortlist.map(clientForPrompt)
    );

    const byId = new Map(shortlist.map((entry) => [entry.client.id, entry.client]));

    const assessed: ClientMatch[] = result.matches
      .filter((match) => byId.has(match.client_id))
      .map((match) => {
        const client = byId.get(match.client_id);
        const gates = match.gates ?? [];

        // The invariant the whole three-valued gate design exists to protect:
        // an exclusion has to be earned by a gate that positively fails. Left
        // to itself the model excludes clients whose records are merely thin -
        // no named partner, nothing said about match funding, not spoken to
        // since last year - which is exactly the silence that should have
        // become a question on the call. Those get demoted to a long shot and
        // stay on the sheet.
        const failed = gates.some((gate) => gate.verdict === 'fail');
        const verdict = match.verdict === 'excluded' && !failed ? 'long_shot' : match.verdict;

        return {
          client_id: match.client_id,
          client_name: client?.name ?? match.client_id,
          igs_owner: client?.igs_owner ?? null,
          last_contact: client?.last_contact ?? null,
          verdict,
          score: Math.max(0, Math.min(100, Math.round(match.score))),
          why: match.why,
          evidence: (match.evidence ?? []).map((item) => ({
            quote: item.quote,
            meeting_date: item.meeting_date ?? undefined,
          })),
          gates,
          questions_to_ask: match.questions_to_ask ?? [],
          gaps: match.gaps ?? [],
          opening_line: match.opening_line,
        };
      })
      .sort((a, b) => VERDICT_RANK[a.verdict] - VERDICT_RANK[b.verdict] || b.score - a.score);

    const matches = assessed.filter((match) => match.verdict !== 'excluded');

    // Everything ruled out, from both halves of the pipeline: the model's
    // evidenced exclusions and the cheap prefilter. Shown so the coach can see
    // where the list ends rather than wondering what the app quietly dropped.
    const excluded: ExcludedClient[] = [
      ...assessed
        .filter((match) => match.verdict === 'excluded')
        .map((match) => ({
          client_id: match.client_id,
          client_name: match.client_name,
          reason: match.gates.find((gate) => gate.verdict === 'fail')?.note ?? match.why,
        })),
      ...skipped,
    ];

    // A shortlisted client the model simply did not return would otherwise
    // vanish between the two lists without ever being ruled out.
    const assessedIds = new Set(assessed.map((match) => match.client_id));
    const unreturned = shortlist.filter((entry) => !assessedIds.has(entry.client.id));
    if (unreturned.length) {
      warnings.push(
        `The AI did not give a verdict on ${unreturned.map((entry) => entry.client.name).join(', ')}. Worth a look yourself.`
      );
    }

    if (excluded.length > MAX_EXCLUSIONS_RETURNED) {
      warnings.push(`${excluded.length - MAX_EXCLUSIONS_RETURNED} further clients were ruled out and are not listed.`);
    }
    if (!matches.length) {
      warnings.push('The AI did not rate any of the shortlisted clients as worth a call for this competition.');
    }

    const callSheet: CallSheet = {
      opportunity,
      timing,
      matches,
      excluded: excluded.slice(0, MAX_EXCLUSIONS_RETURNED),
      shortlisted: shortlist.length,
      register_size: register.clients.length,
      warnings,
    };

    return NextResponse.json(callSheet);
  } catch (error) {
    console.error('Client match error:', error);
    const message = error instanceof Error ? error.message : 'Error matching clients to this opportunity';
    return NextResponse.json({ detail: message }, { status: 500 });
  }
}
