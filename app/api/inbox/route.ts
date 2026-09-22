import { NextRequest, NextResponse } from 'next/server';
import { parseOpportunity } from '../utils/opportunity-processor';
import { DEFAULT_OPPORTUNITY_PROMPT } from '@/lib/opportunity-prompts';
import { computeTiming } from '@/lib/opportunity-timing';
import { parseEmail } from '@/lib/email-parse';
import { dedupeItems, fingerprintOpportunity, sortItems } from '@/lib/inbox';
import type { InboxItem, InboxResponse } from '@/lib/opportunity-types';

// A batch of model calls, run a few at a time.
export const runtime = 'nodejs';

/**
 * How many emails one request will read. A spending limit rather than a time
 * limit, now that this runs locally with no request timeout to fit inside.
 */
const MAX_EMAILS = Number(process.env.IGS_MAX_EMAILS_PER_SYNC) || 200;

/**
 * Model calls in flight at once. Set by what the OpenAI account will take
 * without rate limiting, not by the host.
 */
const CONCURRENCY = 5;

/** Shorter than this and there is nothing for the parser to read. */
const MIN_BODY_LENGTH = 40;

interface InboxRequestBody {
  emails?: unknown;
  prompt?: unknown;
}

/** One email as it arrives: either a raw saved message, or its parts. */
interface IncomingEmail {
  raw?: unknown;
  body?: unknown;
  from?: unknown;
  subject?: unknown;
  received_at?: unknown;
}

function asString(value: unknown): string | null {
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

/** Run tasks a few at a time, keeping results in the order they were given. */
async function mapWithConcurrency<T, R>(
  items: T[],
  limit: number,
  task: (item: T, index: number) => Promise<R>
): Promise<R[]> {
  const results = new Array<R>(items.length);
  let next = 0;

  const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
    for (;;) {
      const index = next;
      next += 1;
      if (index >= items.length) return;
      results[index] = await task(items[index], index);
    }
  });

  await Promise.all(workers);
  return results;
}

export async function POST(request: NextRequest) {
  try {
    // Like every route here, this one is unauthenticated. That is the right
    // call for an app that runs on one person's machine bound to the loopback
    // address: the only caller is the coach sitting in front of it, and a
    // login would be ceremony. It stops being the right call the moment this
    // is served to anything but localhost.
    const body = (await request.json()) as InboxRequestBody;
    if (!Array.isArray(body.emails) || body.emails.length === 0) {
      return NextResponse.json({ detail: 'Send one or more emails to read.' }, { status: 400 });
    }

    const promptText =
      typeof body.prompt === 'string' && body.prompt.trim() ? body.prompt.trim() : DEFAULT_OPPORTUNITY_PROMPT;

    const warnings: string[] = [];

    const incoming = body.emails.slice(0, MAX_EMAILS);
    if (body.emails.length > MAX_EMAILS) {
      warnings.push(
        `${body.emails.length} emails were sent; the first ${MAX_EMAILS} were read. Send the rest in another batch.`
      );
    }

    // Decode each message before spending anything on it, so an empty or
    // unreadable file is reported rather than charged for.
    const readable: { parsed: ReturnType<typeof parseEmail>; index: number }[] = [];

    incoming.forEach((entry: unknown, index: number) => {
      const email: IncomingEmail = typeof entry === 'string' ? { raw: entry } : (entry as IncomingEmail) ?? {};
      const raw = asString(email.raw) ?? asString(email.body);

      if (!raw) {
        warnings.push(`Email ${index + 1} was empty and was skipped.`);
        return;
      }

      const parsed = parseEmail(raw);

      // Headers supplied by the caller win over anything scraped from the body:
      // a mail rule knows the real sender, a saved file only has what it kept.
      parsed.from = asString(email.from) ?? parsed.from;
      parsed.subject = asString(email.subject) ?? parsed.subject;
      parsed.received_at = asString(email.received_at) ?? parsed.received_at;

      if (parsed.body.length < MIN_BODY_LENGTH) {
        warnings.push(
          `${parsed.subject ?? `Email ${index + 1}`} had no readable body once the quoted history was removed, and was skipped.`
        );
        return;
      }

      readable.push({ parsed, index });
    });

    if (!readable.length) {
      return NextResponse.json(
        { items: [], processed: 0, duplicates_merged: 0, warnings } satisfies InboxResponse
      );
    }

    const results = await mapWithConcurrency(readable, CONCURRENCY, async ({ parsed, index }) => {
      try {
        // The subject carries the competition name more often than the body
        // does, so it goes in front of the message rather than being dropped.
        const text = parsed.subject ? `Subject: ${parsed.subject}\n\n${parsed.body}` : parsed.body;
        const opportunity = await parseOpportunity(text, promptText);

        const item: InboxItem = {
          id: fingerprintOpportunity(opportunity, `${index}-${parsed.subject ?? ''}`),
          opportunity,
          timing: computeTiming(opportunity),
          sources: [{ from: parsed.from, subject: parsed.subject, received_at: parsed.received_at }],
          warnings: [...parsed.warnings, ...opportunity.warnings],
        };
        return item;
      } catch (error) {
        console.error('Inbox item failed:', error);
        warnings.push(
          `${parsed.subject ?? `Email ${index + 1}`} could not be read: ${
            error instanceof Error ? error.message : 'unknown error'
          }`
        );
        return null;
      }
    });

    const parsedItems = results.filter((item): item is InboxItem => item !== null);
    const { items: deduped, merged } = dedupeItems(parsedItems);

    const response: InboxResponse = {
      items: sortItems(deduped),
      processed: parsedItems.length,
      duplicates_merged: merged,
      warnings,
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('Inbox processing error:', error);
    const message = error instanceof Error ? error.message : 'Error reading these emails';
    return NextResponse.json({ detail: message }, { status: 500 });
  }
}
