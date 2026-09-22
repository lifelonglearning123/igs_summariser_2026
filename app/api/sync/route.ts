import { NextRequest, NextResponse } from 'next/server';
import { parseOpportunity } from '../utils/opportunity-processor';
import { DEFAULT_OPPORTUNITY_PROMPT } from '@/lib/opportunity-prompts';
import { computeTiming } from '@/lib/opportunity-timing';
import { parseEmail } from '@/lib/email-parse';
import { triageEmail } from '@/lib/mail-triage';
import { fingerprintOpportunity, sortItems } from '@/lib/inbox';
import {
  DEFAULT_SETTINGS,
  hasSeen,
  mergeIntoStore,
  readStore,
  recordSeen,
  removeItem,
  writeStore,
  type SyncSettings,
} from '@/lib/server/local-store';
import { readOutlookMessages, type OutlookMessage } from '@/lib/server/outlook-sync';
import type { CallSheet, InboxItem } from '@/lib/opportunity-types';

// Reads the mailbox and runs a model call per surviving email.
export const runtime = 'nodejs';

/**
 * Model calls one sync will make.
 *
 * This is a spending limit, not a time limit: the app runs locally, so there
 * is no request timeout to fit inside and a sync can take as long as it needs.
 * The ceiling is only here so that pointing a fresh install at a year of mail
 * cannot quietly run up a bill. Check first reports the exact number before
 * anything is spent, which is the real guard.
 */
const MAX_PARSED_PER_SYNC = Number(process.env.IGS_MAX_EMAILS_PER_SYNC) || 200;

/**
 * Model calls in flight at once. Unlike the cap above this is not about the
 * host: it is what the OpenAI account will take without rate limiting, so it
 * stays where it is.
 */
const CONCURRENCY = 5;

interface SyncRequestBody {
  settings?: Partial<SyncSettings>;
  /** Read the mailbox but do not spend anything: used to preview a sync. */
  dryRun?: boolean;
}

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

/** GET: the stored inbox, sorted, with fresh decide-by dates. */
export async function GET() {
  try {
    const store = await readStore();

    // Timings are recomputed on read rather than trusted from the file: a
    // decide-by date stored last week would quietly be a week stale.
    const items = store.items.map((item) => ({ ...item, timing: computeTiming(item.opportunity) }));

    return NextResponse.json({
      items: sortItems(items),
      callSheets: store.callSheets,
      settings: store.settings,
      updated: store.updated,
      seen_count: Object.keys(store.seen).length,
    });
  } catch (error) {
    console.error('Inbox read error:', error);
    return NextResponse.json({ detail: 'Could not read the local inbox.' }, { status: 500 });
  }
}

/** DELETE: forget one opportunity, or reset the whole local database. */
export async function DELETE(request: NextRequest) {
  try {
    const id = new URL(request.url).searchParams.get('id');
    const store = await readStore();

    if (id) {
      const removed = removeItem(store, id);
      await writeStore(store);
      return NextResponse.json({ removed });
    }

    store.items = [];
    store.callSheets = {};
    store.seen = {};
    await writeStore(store);
    return NextResponse.json({ reset: true });
  } catch (error) {
    console.error('Inbox delete error:', error);
    return NextResponse.json({ detail: 'Could not update the local inbox.' }, { status: 500 });
  }
}

/** PUT: keep a call sheet against a stored opportunity, so a match is paid for once. */
export async function PUT(request: NextRequest) {
  try {
    const body = (await request.json()) as { item_id?: unknown; call_sheet?: unknown };
    const itemId = typeof body.item_id === 'string' ? body.item_id : null;
    if (!itemId || !body.call_sheet) {
      return NextResponse.json({ detail: 'An item id and a call sheet are required.' }, { status: 400 });
    }

    const store = await readStore();
    store.callSheets[itemId] = body.call_sheet as CallSheet;
    await writeStore(store);
    return NextResponse.json({ saved: true });
  } catch (error) {
    console.error('Call sheet save error:', error);
    return NextResponse.json({ detail: 'Could not save the call sheet.' }, { status: 500 });
  }
}

/** POST: pull new mail from Outlook and read whatever looks like funding. */
export async function POST(request: NextRequest) {
  try {
    const body = (await request.json().catch(() => ({}))) as SyncRequestBody;
    const store = await readStore();

    const settings: SyncSettings = {
      ...DEFAULT_SETTINGS,
      ...store.settings,
      ...(body.settings ?? {}),
    };
    store.settings = settings;

    let messages: OutlookMessage[];
    let folder: string | null;
    try {
      const result = await readOutlookMessages({
        folderName: settings.outlookFolder,
        lookbackDays: settings.lookbackDays,
      });
      messages = result.messages;
      folder = result.folder;
    } catch (error) {
      return NextResponse.json(
        { detail: error instanceof Error ? error.message : 'Outlook could not be reached.' },
        { status: 502 }
      );
    }

    const fresh = messages.filter((message) => !hasSeen(store, message.id));

    // The cheap pass. Everything that fails it is marked as read anyway, so a
    // second press of Sync does not walk over the same four hundred messages.
    const candidates: typeof fresh = [];
    let skippedAsIrrelevant = 0;

    for (const message of fresh) {
      const parsed = parseEmail(message.body);
      const verdict = triageEmail(message.subject, parsed.body || message.body);
      if (verdict.relevant) {
        candidates.push(message);
      } else {
        skippedAsIrrelevant += 1;
        recordSeen(store, message.id, message.subject);
      }
    }

    if (body.dryRun) {
      await writeStore(store);
      return NextResponse.json({
        dry_run: true,
        folder,
        scanned: messages.length,
        already_read: messages.length - fresh.length,
        skipped_as_irrelevant: skippedAsIrrelevant,
        would_read: candidates.length,
      });
    }

    const toRead = candidates.slice(0, MAX_PARSED_PER_SYNC);
    const deferred = candidates.length - toRead.length;
    const warnings: string[] = [];

    const results = await mapWithConcurrency(toRead, CONCURRENCY, async (message) => {
      const parsed = parseEmail(message.body);
      const text = message.subject ? `Subject: ${message.subject}\n\n${parsed.body}` : parsed.body;

      try {
        const opportunity = await parseOpportunity(text, DEFAULT_OPPORTUNITY_PROMPT);
        const item: InboxItem = {
          id: fingerprintOpportunity(opportunity, message.id),
          opportunity,
          timing: computeTiming(opportunity),
          sources: [
            { from: message.from, subject: message.subject, received_at: message.received_at },
          ],
          warnings: [...parsed.warnings, ...opportunity.warnings],
        };
        return { item, id: message.id, subject: message.subject };
      } catch (error) {
        console.error('Sync item failed:', error);
        warnings.push(
          `${message.subject ?? 'One email'} could not be read: ${
            error instanceof Error ? error.message : 'unknown error'
          }`
        );
        // Deliberately not marked as read, so the next sync tries it again.
        return null;
      }
    });

    const read = results.filter((entry): entry is NonNullable<typeof entry> => entry !== null);
    for (const entry of read) {
      recordSeen(store, entry.id, entry.subject);
    }

    const { added, merged } = mergeIntoStore(
      store,
      read.map((entry) => entry.item)
    );
    await writeStore(store);

    if (deferred > 0) {
      warnings.push(
        `${deferred} more funding email${deferred === 1 ? '' : 's'} were left unread to stay inside the ${MAX_PARSED_PER_SYNC}-email limit for one sync. Press Sync again to read them.`
      );
    }

    const items = store.items.map((item) => ({ ...item, timing: computeTiming(item.opportunity) }));

    return NextResponse.json({
      items: sortItems(items),
      callSheets: store.callSheets,
      settings: store.settings,
      updated: store.updated,
      folder,
      scanned: messages.length,
      already_read: messages.length - fresh.length,
      skipped_as_irrelevant: skippedAsIrrelevant,
      read: read.length,
      added,
      merged,
      deferred,
      warnings,
    });
  } catch (error) {
    console.error('Sync error:', error);
    const message = error instanceof Error ? error.message : 'Sync failed';
    return NextResponse.json({ detail: message }, { status: 500 });
  }
}
