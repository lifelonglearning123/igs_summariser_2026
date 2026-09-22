'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { AlertCircle } from 'lucide-react';
import { useAuthStore } from '@/lib/auth-store';
import {
  loadInbox,
  matchOpportunity,
  readInbox,
  saveCallSheet,
  syncInbox,
} from '@/lib/api-client';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import DashboardHeader from '@/components/dashboard-header';
import RegisterLoader from '@/components/register-loader';
import InboxList from '@/components/inbox-list';
import SyncPanel, { type DroppedFile, type SyncOutcome, type SyncSettings } from '@/components/sync-panel';
import { dedupeItems, inboxHeadline, sortItems } from '@/lib/inbox';
import { matchesToPlainText } from '@/lib/opportunity-prompts';
import { loadStoredRegister, type LoadedRegister } from '@/lib/register-storage';
import type { CallSheet as CallSheetData, InboxItem, InboxResponse } from '@/lib/opportunity-types';

/**
 * Hand-dropped files are still sent in batches, but only so a big drop reports
 * progress as it goes. There is no request timeout to work around locally.
 */
const BATCH_SIZE = 50;

const DEFAULT_SETTINGS: SyncSettings = { outlookFolder: '', lookbackDays: 30 };

export default function InboxPage() {
  const router = useRouter();
  const user = useAuthStore((state) => state.user);
  const hydrated = useAuthStore((state) => state.hydrated);
  const logout = useAuthStore((state) => state.logout);

  const [items, setItems] = useState<InboxItem[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [settings, setSettings] = useState<SyncSettings>(DEFAULT_SETTINGS);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);
  const [outcome, setOutcome] = useState<SyncOutcome | null>(null);

  const [files, setFiles] = useState<DroppedFile[]>([]);
  const [register, setRegister] = useState<LoadedRegister | null>(null);
  const [callSheets, setCallSheets] = useState<Record<string, CallSheetData>>({});

  const [syncing, setSyncing] = useState(false);
  const [progress, setProgress] = useState('');
  const [matchingId, setMatchingId] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [error, setError] = useState('');

  useEffect(() => {
    if (hydrated && !user) router.push('/');
  }, [hydrated, user, router]);

  useEffect(() => {
    setRegister(loadStoredRegister());
  }, []);

  // The local database is the source of truth, so the page opens on whatever
  // the last sync left behind rather than on an empty screen.
  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const stored = await loadInbox();
        if (cancelled) return;
        setItems(stored.items ?? []);
        setCallSheets(stored.callSheets ?? {});
        setLastUpdated(stored.updated ?? null);
        if (stored.settings) {
          setSettings({
            outlookFolder: stored.settings.outlookFolder ?? '',
            lookbackDays: stored.settings.lookbackDays ?? 30,
          });
        }
      } catch {
        // No database yet, or the app is running somewhere without one.
      } finally {
        if (!cancelled) setLoaded(true);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  const handleLogout = () => {
    logout();
    router.push('/');
  };

  const handleSync = async (dryRun: boolean) => {
    setSyncing(true);
    setError('');
    setOutcome(null);
    setProgress(dryRun ? 'Checking the mailbox...' : 'Reading the mailbox, this can take a couple of minutes...');

    try {
      const result = await syncInbox({ settings, dryRun });
      setOutcome(result);

      if (!dryRun) {
        setItems(result.items ?? []);
        setCallSheets(result.callSheets ?? {});
        setLastUpdated(result.updated ?? null);
        setWarnings(result.warnings ?? []);
      }
    } catch (err: any) {
      setError(err?.response?.data?.detail ?? 'Could not sync from Outlook.');
    } finally {
      setSyncing(false);
      setProgress('');
    }
  };

  const handleFiles = useCallback(async (fileList: FileList) => {
    setError('');

    // Classic Outlook writes .msg when you drag a message out, which is a
    // binary compound file rather than a saved internet message. Say so
    // plainly instead of letting it fail as unreadable text further down.
    const incoming = Array.from(fileList);
    const outlookBinary = incoming.filter((file) => /\.msg$/i.test(file.name));
    const usable = incoming.filter((file) => !/\.msg$/i.test(file.name));

    if (outlookBinary.length) {
      setError(
        `${outlookBinary.length} .msg file${outlookBinary.length === 1 ? '' : 's'} skipped. Use Sync instead, which reads Outlook directly, or save the message as Text Only.`
      );
    }

    if (!usable.length) return;

    const read = await Promise.all(usable.map(async (file) => ({ name: file.name, text: await file.text() })));
    setFiles((current) => {
      const seen = new Set(current.map((file) => file.name));
      return [...current, ...read.filter((file) => !seen.has(file.name))];
    });
  }, []);

  const handleReadFiles = async () => {
    if (!files.length) return;

    setSyncing(true);
    setError('');
    const collected: InboxItem[] = [...items];
    const collectedWarnings: string[] = [];

    try {
      for (let start = 0; start < files.length; start += BATCH_SIZE) {
        const batch = files.slice(start, start + BATCH_SIZE);
        setProgress(`Reading ${start + 1} to ${Math.min(start + batch.length, files.length)} of ${files.length}...`);

        const result = (await readInbox({ emails: batch.map((file) => ({ raw: file.text })) })) as InboxResponse;
        collected.push(...result.items);
        collectedWarnings.push(...result.warnings);
      }

      const { items: deduped } = dedupeItems(collected);
      setItems(sortItems(deduped));
      setWarnings(collectedWarnings);
      setFiles([]);
    } catch (err: any) {
      setError(err?.response?.data?.detail ?? 'Could not read these files.');
    } finally {
      setSyncing(false);
      setProgress('');
    }
  };

  const handleMatch = async (item: InboxItem) => {
    if (!register) return;
    setMatchingId(item.id);
    setError('');

    try {
      const result = (await matchOpportunity({
        opportunity: item.opportunity,
        register: register.raw,
      })) as CallSheetData;

      setCallSheets((current) => ({ ...current, [item.id]: result }));
      // Kept locally so re-opening the opportunity tomorrow does not pay for
      // the same match again.
      await saveCallSheet({ item_id: item.id, call_sheet: result }).catch(() => undefined);
    } catch (err: any) {
      setError(err?.response?.data?.detail ?? 'Could not match clients to this opportunity.');
    } finally {
      setMatchingId(null);
    }
  };

  const handleCopy = async (item: InboxItem) => {
    const sheet = callSheets[item.id];
    if (!sheet) return;
    try {
      await navigator.clipboard.writeText(matchesToPlainText(sheet.opportunity, sheet.timing, sheet.matches));
      setCopiedId(item.id);
      window.setTimeout(() => setCopiedId(null), 2000);
    } catch {
      setError('Could not copy to the clipboard. Please select the text and copy it manually.');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      <DashboardHeader user={user} onLogout={handleLogout} />

      <main className="mx-auto max-w-5xl px-4 py-8">
        <div className="mb-8">
          <h1 className="mb-2 text-4xl font-bold text-gray-900">Funding inbox</h1>
          <p className="text-gray-600">
            Press Sync and the app reads your Outlook mail, keeps what looks like funding, collapses duplicates, and
            sorts what is left by when you actually have to decide.
          </p>
        </div>

        {error && (
          <Alert variant="destructive" className="mb-6">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <div className="space-y-6">
          <SyncPanel
            settings={settings}
            onSettingsChange={setSettings}
            onSync={handleSync}
            syncing={syncing}
            progress={progress}
            outcome={outcome}
            lastUpdated={lastUpdated}
            files={files}
            onFiles={handleFiles}
            onRemoveFile={(name) => setFiles((current) => current.filter((file) => file.name !== name))}
            onReadFiles={handleReadFiles}
          />

          <RegisterLoader register={register} onChange={setRegister} onError={setError} />

          {loaded && (
            <Card>
              <CardHeader>
                <CardTitle>{items.length ? inboxHeadline(items) : 'Nothing here yet'}</CardTitle>
                <CardDescription>
                  {items.length
                    ? `${items.length} opportunit${items.length === 1 ? 'y' : 'ies'} stored on this machine.`
                    : 'Press Sync emails to read your Outlook mail.'}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {warnings.length > 0 && (
                  <div className="rounded-lg border border-amber-200 bg-amber-50 p-3">
                    <ul className="space-y-1 text-sm text-amber-900">
                      {warnings.map((warning, index) => (
                        <li key={index}>{warning}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {items.length > 0 && (
                  <InboxList
                    items={items}
                    hasRegister={Boolean(register)}
                    callSheets={callSheets}
                    matchingId={matchingId}
                    copiedId={copiedId}
                    onMatch={handleMatch}
                    onCopy={handleCopy}
                  />
                )}
              </CardContent>
            </Card>
          )}
        </div>
      </main>
    </div>
  );
}
