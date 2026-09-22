/**
 * The local database.
 *
 * A JSON file on the machine the app runs on. No cloud, no vendor, no client
 * correspondence leaving the building - which is the point, given what is in
 * these records.
 *
 * A file rather than SQLite because the volume does not justify a native
 * dependency: a few hundred opportunities and their call sheets is nothing,
 * and `better-sqlite3` is a compiler toolchain away from working on Windows.
 * If this ever outgrows a file, everything below the exported functions can be
 * swapped without the routes noticing.
 *
 * Writes go through a temp file and a rename, so an interrupted write cannot
 * leave a half-written database behind.
 */

import { promises as fs } from 'fs';
import path from 'path';
import { dedupeItems } from '../inbox';
import type { CallSheet, InboxItem } from '../opportunity-types';

export interface SyncSettings {
  /** Outlook folder to read. Empty means the default Inbox. */
  outlookFolder: string;
  /** How far back to look on each sync. */
  lookbackDays: number;
  /** Optional folder of saved .eml/.txt files to read as well. */
  watchFolder: string | null;
}

export interface SeenEmail {
  subject: string | null;
  at: string;
}

export interface StoredInbox {
  version: 1;
  updated: string | null;
  settings: SyncSettings;
  items: InboxItem[];
  /** Call sheets keyed by inbox item id, so a match is paid for once. */
  callSheets: Record<string, CallSheet>;
  /**
   * Every email already read, keyed by its Outlook entry id or a hash of its
   * text. This is what stops a re-sync spending money re-reading the same
   * hundred messages, and it is the difference between a sync button that is
   * cheap to press and one that is not.
   */
  seen: Record<string, SeenEmail>;
}

export const DEFAULT_SETTINGS: SyncSettings = {
  outlookFolder: '',
  lookbackDays: 30,
  watchFolder: null,
};

function emptyStore(): StoredInbox {
  return {
    version: 1,
    updated: null,
    settings: { ...DEFAULT_SETTINGS },
    items: [],
    callSheets: {},
    seen: {},
  };
}

/** Where the database lives. Override with IGS_DATA_DIR to move it. */
export function dataDir(): string {
  return process.env.IGS_DATA_DIR || path.join(process.cwd(), 'data');
}

function storePath(): string {
  return path.join(dataDir(), 'inbox.json');
}

export async function readStore(): Promise<StoredInbox> {
  try {
    const raw = await fs.readFile(storePath(), 'utf8');
    const parsed = JSON.parse(raw) as Partial<StoredInbox>;
    return {
      ...emptyStore(),
      ...parsed,
      settings: { ...DEFAULT_SETTINGS, ...(parsed.settings ?? {}) },
      items: Array.isArray(parsed.items) ? parsed.items : [],
      callSheets: parsed.callSheets ?? {},
      seen: parsed.seen ?? {},
    };
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return emptyStore();
    // A corrupt file should not brick the app: start fresh, keeping the old
    // one alongside so nothing is silently destroyed.
    console.error('Inbox store unreadable, starting a new one:', error);
    try {
      await fs.rename(storePath(), `${storePath()}.corrupt-${Date.now()}`);
    } catch {
      // Nothing more to do.
    }
    return emptyStore();
  }
}

export async function writeStore(store: StoredInbox): Promise<void> {
  await fs.mkdir(dataDir(), { recursive: true });
  const target = storePath();
  const temp = `${target}.${process.pid}.tmp`;

  const payload = JSON.stringify({ ...store, updated: new Date().toISOString() }, null, 2);
  await fs.writeFile(temp, payload, 'utf8');
  await fs.rename(temp, target);
}

/** True when this email has already been read and charged for. */
export function hasSeen(store: StoredInbox, key: string): boolean {
  return Object.prototype.hasOwnProperty.call(store.seen, key);
}

export function recordSeen(store: StoredInbox, key: string, subject: string | null): void {
  store.seen[key] = { subject, at: new Date().toISOString() };
}

/**
 * Fold newly read opportunities into the stored ones.
 *
 * The same competition turning up again - a reminder in October about a call
 * first seen in September - merges into the existing item and adds its email
 * as another source, rather than appearing twice.
 */
export function mergeIntoStore(store: StoredInbox, incoming: InboxItem[]): { added: number; merged: number } {
  const before = new Set(store.items.map((item) => item.id));

  // Deliberately the same merge the inbox uses, over the old and new items
  // together, so a competition already stored under one name does not gain a
  // second entry when a digest mentions it again next week.
  const { items } = dedupeItems([...store.items, ...incoming]);

  // Timings are recomputed on read, but the freshly parsed ones are kept here
  // so a stored item is never left holding a decide-by date from last month.
  const freshTiming = new Map(incoming.map((item) => [item.id, item.timing]));
  store.items = items.map((item) =>
    freshTiming.has(item.id) ? { ...item, timing: freshTiming.get(item.id) as InboxItem['timing'] } : item
  );

  const added = store.items.filter((item) => !before.has(item.id)).length;
  return { added, merged: Math.max(0, incoming.length - added) };
}

/** Forget one opportunity and anything hanging off it. */
export function removeItem(store: StoredInbox, id: string): boolean {
  const before = store.items.length;
  store.items = store.items.filter((item) => item.id !== id);
  delete store.callSheets[id];
  return store.items.length !== before;
}
