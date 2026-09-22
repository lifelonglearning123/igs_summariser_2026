'use client';

import React, { useState } from 'react';
import { ChevronDown, ChevronRight, RefreshCw, Search, Upload, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';

export interface SyncSettings {
  outlookFolder: string;
  lookbackDays: number;
}

export interface SyncOutcome {
  folder?: string | null;
  scanned?: number;
  already_read?: number;
  skipped_as_irrelevant?: number;
  read?: number;
  added?: number;
  merged?: number;
  deferred?: number;
  dry_run?: boolean;
  would_read?: number;
}

export interface DroppedFile {
  name: string;
  text: string;
}

interface SyncPanelProps {
  settings: SyncSettings;
  onSettingsChange: (settings: SyncSettings) => void;
  onSync: (dryRun: boolean) => void;
  syncing: boolean;
  progress: string;
  outcome: SyncOutcome | null;
  lastUpdated: string | null;

  files: DroppedFile[];
  onFiles: (files: FileList) => void;
  onRemoveFile: (name: string) => void;
  onReadFiles: () => void;
}

/** Plain-English account of what a sync did, so the cost is never a mystery. */
function outcomeLine(outcome: SyncOutcome): string {
  if (outcome.dry_run) {
    const would = outcome.would_read ?? 0;
    return `${outcome.scanned ?? 0} messages in the window, ${outcome.already_read ?? 0} already read, ${
      outcome.skipped_as_irrelevant ?? 0
    } not about funding. ${would} would be read${would ? ' by the AI' : ''}.`;
  }

  const parts = [
    `${outcome.scanned ?? 0} messages scanned`,
    `${outcome.already_read ?? 0} already read`,
    `${outcome.skipped_as_irrelevant ?? 0} not about funding`,
    `${outcome.read ?? 0} read by the AI`,
  ];
  if (outcome.added) parts.push(`${outcome.added} new`);
  if (outcome.merged) parts.push(`${outcome.merged} merged into existing`);
  return `${parts.join(', ')}.`;
}

export default function SyncPanel({
  settings,
  onSettingsChange,
  onSync,
  syncing,
  progress,
  outcome,
  lastUpdated,
  files,
  onFiles,
  onRemoveFile,
  onReadFiles,
}: SyncPanelProps) {
  const [showSettings, setShowSettings] = useState(false);
  const [showManual, setShowManual] = useState(false);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <RefreshCw className="h-5 w-5" />
          Sync from Outlook
        </CardTitle>
        <CardDescription>
          Reads your mailbox on this machine. Nothing leaves the PC except the funding emails themselves, which go to
          the AI to be read.
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        <div className="flex flex-wrap items-center gap-3">
          <Button onClick={() => onSync(false)} disabled={syncing} className="gap-2">
            {syncing ? (
              <>
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                Syncing...
              </>
            ) : (
              <>
                <RefreshCw className="h-4 w-4" />
                Sync emails
              </>
            )}
          </Button>

          <Button variant="outline" onClick={() => onSync(true)} disabled={syncing} className="gap-2">
            <Search className="h-4 w-4" />
            Check first
          </Button>

          {lastUpdated && (
            <span className="text-sm text-gray-500">
              Last synced {new Date(lastUpdated).toLocaleString('en-GB')}
            </span>
          )}
        </div>

        {progress && <p className="text-sm text-gray-500">{progress}</p>}

        {outcome && (
          <div className="rounded-lg border border-blue-200 bg-blue-50 p-3 text-sm text-blue-900">
            {outcomeLine(outcome)}
            {outcome.folder && <span className="text-blue-700"> Folder: {outcome.folder}.</span>}
          </div>
        )}

        <button
          type="button"
          onClick={() => setShowSettings((open) => !open)}
          className="inline-flex items-center gap-1 text-sm font-medium text-gray-600 hover:text-gray-900"
        >
          {showSettings ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
          Settings
        </button>

        {showSettings && (
          <div className="grid gap-4 rounded-lg border border-gray-200 p-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700" htmlFor="outlook-folder">
                Outlook folder
              </label>
              <Input
                id="outlook-folder"
                value={settings.outlookFolder}
                placeholder="Inbox"
                onChange={(event) => onSettingsChange({ ...settings, outlookFolder: event.target.value })}
              />
              <p className="mt-1 text-xs text-gray-500">
                Leave blank for the Inbox. Name a folder to read only what you file there.
              </p>
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700" htmlFor="lookback-days">
                Look back (days)
              </label>
              <Input
                id="lookback-days"
                type="number"
                min={1}
                max={365}
                value={settings.lookbackDays}
                onChange={(event) =>
                  onSettingsChange({ ...settings, lookbackDays: Number(event.target.value) || 30 })
                }
              />
              <p className="mt-1 text-xs text-gray-500">
                Emails already read are never read again, so a wide window is only slow the first time.
              </p>
            </div>
          </div>
        )}

        <div className="border-t border-gray-200 pt-3">
          <button
            type="button"
            onClick={() => setShowManual((open) => !open)}
            className="inline-flex items-center gap-1 text-sm font-medium text-gray-600 hover:text-gray-900"
          >
            {showManual ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
            Add saved emails by hand
          </button>

          {showManual && (
            <div className="mt-3 space-y-3">
              <label
                onDragOver={(event) => event.preventDefault()}
                onDrop={(event) => {
                  event.preventDefault();
                  if (event.dataTransfer.files.length) onFiles(event.dataTransfer.files);
                }}
                className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-gray-300 p-6 text-sm text-gray-600 hover:border-gray-400 hover:bg-gray-50"
              >
                <Upload className="h-5 w-5" />
                <span>Drop .eml or .txt files here</span>
                <input
                  type="file"
                  multiple
                  accept=".eml,.txt,.msg,message/rfc822,text/plain"
                  className="hidden"
                  onChange={(event) => {
                    if (event.target.files?.length) onFiles(event.target.files);
                    event.target.value = '';
                  }}
                />
              </label>

              {files.length > 0 && (
                <>
                  <div className="space-y-1">
                    {files.map((file) => (
                      <div
                        key={file.name}
                        className="flex items-center justify-between rounded border border-gray-200 bg-gray-50 px-3 py-1.5 text-sm"
                      >
                        <span className="truncate text-gray-700">{file.name}</span>
                        <button
                          onClick={() => onRemoveFile(file.name)}
                          className="text-gray-400 hover:text-gray-700"
                          aria-label={`Remove ${file.name}`}
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                  <Button variant="outline" onClick={onReadFiles} disabled={syncing}>
                    Read {files.length} file{files.length === 1 ? '' : 's'}
                  </Button>
                </>
              )}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
