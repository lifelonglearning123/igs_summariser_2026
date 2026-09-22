/**
 * Reading the mailbox directly, on this machine.
 *
 * Classic Outlook exposes COM automation to anything running as the same
 * Windows user, so a short PowerShell script can walk a mail folder and hand
 * back the messages. That buys the whole ingestion problem for nothing: no
 * Azure app registration, no admin consent, no forwarding address, no third
 * party touching client correspondence. It also sidesteps the .msg problem
 * entirely, because COM gives the body as text.
 *
 * The cost is that it only works where it runs: Windows, with classic Outlook
 * installed and a mail profile configured. That is exactly the machine this
 * app is meant to run on, and `probeOutlook` says so plainly when it is not.
 */

import { execFile } from 'child_process';
import { promises as fs } from 'fs';
import os from 'os';
import path from 'path';

export interface OutlookMessage {
  /** Outlook's own stable id, used so a message is never read twice. */
  id: string;
  from: string | null;
  subject: string | null;
  /** ISO datetime. */
  received_at: string | null;
  body: string;
}

/** Long enough for a briefing email, short enough not to bloat the database. */
const MAX_BODY_CHARS = 40_000;

/** Outlook can be slow to start; give it room but never hang the request. */
const TIMEOUT_MS = 90_000;

/**
 * The script is written to a temp file and its output read back from another,
 * rather than going through stdout: PowerShell's console encoding mangles
 * anything non-ASCII, and a pound sign in a grant amount is not optional here.
 */
const SCRIPT = String.raw`
param(
  [string]$FolderName = '',
  [int]$Days = 30,
  [int]$MaxBody = 40000,
  [string]$OutFile
)

$ErrorActionPreference = 'Stop'

function Find-Folder($parent, $name) {
  foreach ($f in $parent.Folders) {
    if ($f.Name -eq $name) { return $f }
  }
  foreach ($f in $parent.Folders) {
    $found = Find-Folder $f $name
    if ($found) { return $found }
  }
  return $null
}

try {
  $outlook = New-Object -ComObject Outlook.Application
  $ns = $outlook.GetNamespace('MAPI')

  # 6 is olFolderInbox.
  $folder = $ns.GetDefaultFolder(6)
  if ($FolderName -ne '') {
    $found = Find-Folder $ns.Folders.Item(1) $FolderName
    if (-not $found) { $found = Find-Folder $folder $FolderName }
    if (-not $found) { throw "Outlook folder '$FolderName' was not found." }
    $folder = $found
  }

  $cutoff = (Get-Date).AddDays(-$Days)
  # Restrict server-side rather than walking the whole mailbox: on a real inbox
  # the difference is seconds against minutes.
  #
  # DASL rather than the [ReceivedTime] shorthand, because the shorthand parses
  # its date against the machine's locale: on a UK machine an MM/dd/yyyy string
  # is silently read as dd/MM/yyyy, so "last 1 day" quietly became "since June"
  # and returned hundreds of messages. DASL takes an unambiguous format.
  $filter = "@SQL=""urn:schemas:httpmail:datereceived"" >= '" + $cutoff.ToString('yyyy-MM-dd HH:mm') + "'"
  $recent = $folder.Items.Restrict($filter)
  # Sort the restricted set, not the source: Restrict returns a new collection
  # that does not inherit the ordering.
  try { $recent.Sort('[ReceivedTime]', $true) } catch { }

  $results = New-Object System.Collections.ArrayList
  foreach ($m in $recent) {
    try {
      # 43 is olMail; skip meeting requests, reports and calendar items.
      if ($m.Class -ne 43) { continue }
      $body = $m.Body
      if ($null -eq $body) { $body = '' }
      if ($body.Length -gt $MaxBody) { $body = $body.Substring(0, $MaxBody) }

      $sender = $m.SenderName
      try { if ($m.SenderEmailAddress) { $sender = "$sender <$($m.SenderEmailAddress)>" } } catch { }

      $null = $results.Add([pscustomobject]@{
        id          = $m.EntryID
        from        = $sender
        subject     = $m.Subject
        received_at = $m.ReceivedTime.ToUniversalTime().ToString('yyyy-MM-ddTHH:mm:ss.fffZ')
        body        = $body
      })
    } catch {
      # One unreadable message must not lose the whole sync.
      continue
    }
  }

  $payload = [pscustomobject]@{ ok = $true; folder = $folder.Name; messages = $results }
} catch {
  $payload = [pscustomobject]@{ ok = $false; error = $_.Exception.Message; messages = @() }
}

$json = $payload | ConvertTo-Json -Depth 4 -Compress
[System.IO.File]::WriteAllText($OutFile, $json, (New-Object System.Text.UTF8Encoding($false)))
`;

interface ScriptResult {
  ok: boolean;
  folder?: string;
  error?: string;
  messages?: OutlookMessage[];
}

function runPowerShell(args: string[], scriptPath: string): Promise<void> {
  return new Promise((resolve, reject) => {
    execFile(
      'powershell.exe',
      ['-NoProfile', '-NonInteractive', '-ExecutionPolicy', 'Bypass', '-File', scriptPath, ...args],
      { timeout: TIMEOUT_MS, windowsHide: true, maxBuffer: 1024 * 1024 },
      (error) => {
        // The script writes its own result file and reports failure inside it,
        // so a non-zero exit only matters when nothing was written at all.
        if (error && (error as NodeJS.ErrnoException).code === 'ENOENT') {
          reject(new Error('PowerShell was not found. Outlook sync only works on Windows.'));
          return;
        }
        resolve();
      }
    );
  });
}

export function isWindows(): boolean {
  return process.platform === 'win32';
}

/**
 * Read recent mail from Outlook.
 *
 * Returns every message in the window; deciding which are new is the caller's
 * job, because only the store knows what has already been read.
 */
export async function readOutlookMessages(options: {
  folderName?: string;
  lookbackDays?: number;
}): Promise<{ messages: OutlookMessage[]; folder: string | null }> {
  if (!isWindows()) {
    throw new Error('Outlook sync needs Windows with classic Outlook installed.');
  }

  const workDir = await fs.mkdtemp(path.join(os.tmpdir(), 'igs-outlook-'));
  const scriptPath = path.join(workDir, 'read-outlook.ps1');
  const outPath = path.join(workDir, 'out.json');

  try {
    // The BOM matters: PowerShell reads a script without one as ANSI.
    await fs.writeFile(scriptPath, `﻿${SCRIPT}`, 'utf8');

    await runPowerShell(
      [
        '-FolderName', options.folderName ?? '',
        '-Days', String(options.lookbackDays ?? 30),
        '-MaxBody', String(MAX_BODY_CHARS),
        '-OutFile', outPath,
      ],
      scriptPath
    );

    let raw: string;
    try {
      raw = await fs.readFile(outPath, 'utf8');
    } catch {
      throw new Error(
        'Outlook did not respond. Check that Outlook is installed and running, and that it is not showing a security prompt.'
      );
    }

    const result = JSON.parse(raw) as ScriptResult;
    if (!result.ok) {
      throw new Error(result.error || 'Outlook returned an error.');
    }

    // ConvertTo-Json collapses a single-element list to an object.
    const messages = Array.isArray(result.messages) ? result.messages : result.messages ? [result.messages] : [];

    return { messages, folder: result.folder ?? null };
  } finally {
    await fs.rm(workDir, { recursive: true, force: true }).catch(() => undefined);
  }
}

/** Whether this machine can sync from Outlook at all, and why not if it cannot. */
export async function probeOutlook(): Promise<{ available: boolean; reason?: string }> {
  if (!isWindows()) {
    return { available: false, reason: 'Outlook sync needs Windows. Drop saved emails instead.' };
  }

  try {
    // A one-message read is the only honest test that COM actually works.
    await readOutlookMessages({ lookbackDays: 1 });
    return { available: true };
  } catch (error) {
    return { available: false, reason: error instanceof Error ? error.message : 'Outlook could not be reached.' };
  }
}
