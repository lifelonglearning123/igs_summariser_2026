/**
 * Reading real email files.
 *
 * An email saved out of Outlook is not the text you would paste. It is RFC 822
 * headers, then usually a MIME tree with a plain-text part and an HTML part,
 * with the interesting words quoted-printable encoded and the subject line
 * possibly base64'd. Underneath the new message sits the whole forwarded
 * history, which is noise for the parser and actively harmful for
 * de-duplication - two different emails quoting the same original would
 * otherwise look alike.
 *
 * This is not a complete MIME implementation. It handles what actually comes
 * out of Outlook and Gmail: multipart/alternative and multipart/mixed, base64
 * and quoted-printable, encoded-word headers, and HTML when there is no plain
 * text part.
 */

export interface ParsedEmail {
  from: string | null;
  subject: string | null;
  /** ISO date the message was sent, where the header could be read. */
  received_at: string | null;
  /** The message body, decoded, de-HTML'd and stripped of quoted history. */
  body: string;
  warnings: string[];
}

/* ------------------------------------------------------------------ */
/* Header decoding                                                     */
/* ------------------------------------------------------------------ */

/** Join header continuation lines back onto the header they belong to. */
function unfold(headerBlock: string): string[] {
  const lines = headerBlock.split(/\r?\n/);
  const headers: string[] = [];

  for (const line of lines) {
    if (/^[ \t]/.test(line) && headers.length) {
      headers[headers.length - 1] += ` ${line.trim()}`;
    } else if (line.trim()) {
      headers.push(line);
    }
  }

  return headers;
}

function headerValue(headers: string[], name: string): string | null {
  const prefix = `${name.toLowerCase()}:`;
  for (const header of headers) {
    if (header.toLowerCase().startsWith(prefix)) {
      return header.slice(prefix.length).trim();
    }
  }
  return null;
}

function decodeBase64(text: string): string {
  try {
    const bytes = Buffer.from(text.replace(/\s+/g, ''), 'base64');
    return new TextDecoder('utf-8').decode(bytes);
  } catch {
    return text;
  }
}

function decodeQuotedPrintable(text: string, charset = 'utf-8'): string {
  // Soft line breaks first, then the =XX escapes, gathered into bytes so that
  // a multi-byte character split across escapes decodes as one character.
  const withoutSoftBreaks = text.replace(/=\r?\n/g, '');
  const bytes: number[] = [];

  for (let i = 0; i < withoutSoftBreaks.length; i += 1) {
    const char = withoutSoftBreaks[i];
    const escape = char === '=' && /^[0-9A-Fa-f]{2}$/.test(withoutSoftBreaks.slice(i + 1, i + 3));
    if (escape) {
      bytes.push(parseInt(withoutSoftBreaks.slice(i + 1, i + 3), 16));
      i += 2;
    } else {
      const encoded = Buffer.from(char, 'utf-8');
      for (let b = 0; b < encoded.length; b += 1) bytes.push(encoded[b]);
    }
  }

  try {
    return new TextDecoder(charset, { fatal: false }).decode(Uint8Array.from(bytes));
  } catch {
    return new TextDecoder('utf-8', { fatal: false }).decode(Uint8Array.from(bytes));
  }
}

/** RFC 2047 encoded-words, as used for subjects with accents or emoji. */
function decodeEncodedWords(text: string): string {
  return text.replace(/=\?([^?]+)\?([BbQq])\?([^?]*)\?=/g, (_match, charset: string, encoding: string, payload: string) => {
    if (encoding.toUpperCase() === 'B') {
      try {
        return new TextDecoder(charset.toLowerCase(), { fatal: false }).decode(
          Uint8Array.from(Buffer.from(payload, 'base64'))
        );
      } catch {
        return decodeBase64(payload);
      }
    }
    // Q encoding is quoted-printable with underscore standing in for space.
    return decodeQuotedPrintable(payload.replace(/_/g, ' '), charset.toLowerCase());
  });
}

/* ------------------------------------------------------------------ */
/* Body extraction                                                     */
/* ------------------------------------------------------------------ */

function contentTypeOf(headers: string[]): { type: string; boundary: string | null; charset: string } {
  const raw = headerValue(headers, 'content-type') ?? 'text/plain';
  const type = raw.split(';')[0].trim().toLowerCase();
  const boundary = /boundary="?([^";]+)"?/i.exec(raw)?.[1] ?? null;
  const charset = /charset="?([^";]+)"?/i.exec(raw)?.[1]?.toLowerCase() ?? 'utf-8';
  return { type, boundary, charset };
}

function decodeBody(body: string, headers: string[]): string {
  const encoding = (headerValue(headers, 'content-transfer-encoding') ?? '7bit').toLowerCase();
  const { charset } = contentTypeOf(headers);

  if (encoding === 'base64') return decodeBase64(body);
  if (encoding === 'quoted-printable') return decodeQuotedPrintable(body, charset);
  return body;
}

export function htmlToText(html: string): string {
  return html
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<head[\s\S]*?<\/head>/gi, ' ')
    .replace(/<!--[\s\S]*?-->/g, ' ')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/(p|div|tr|li|h[1-6]|table)>/gi, '\n')
    .replace(/<li[^>]*>/gi, '- ')
    // Keep the href: competition links are how an opportunity is identified.
    .replace(/<a\b[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi, (_m, href: string, label: string) => {
      const text = label.replace(/<[^>]+>/g, '').trim();
      return text && !text.startsWith('http') ? `${text} ${href}` : href;
    })
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&#(\d+);/g, (_m, code: string) => String.fromCharCode(Number(code)))
    .replace(/[ \t]+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

interface MimePart {
  headers: string[];
  body: string;
}

function splitHeadersAndBody(raw: string): MimePart {
  const separator = /\r?\n\r?\n/.exec(raw);
  if (!separator) return { headers: [], body: raw };
  return {
    headers: unfold(raw.slice(0, separator.index)),
    body: raw.slice(separator.index + separator[0].length),
  };
}

/**
 * Walk the MIME tree and return the best body: plain text if there is any,
 * otherwise HTML flattened to text.
 */
function extractBody(part: MimePart, depth = 0): { text: string | null; html: string | null } {
  const { type, boundary } = contentTypeOf(part.headers);

  if (type.startsWith('multipart/') && boundary && depth < 8) {
    const chunks = part.body.split(new RegExp(`--${boundary.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(?:--)?\\s*\\n`));
    let text: string | null = null;
    let html: string | null = null;

    for (const chunk of chunks) {
      if (!chunk.trim()) continue;
      const child = extractBody(splitHeadersAndBody(chunk), depth + 1);
      // Prefer the first of each kind, which is how alternative parts are ordered.
      if (!text && child.text) text = child.text;
      if (!html && child.html) html = child.html;
    }

    return { text, html };
  }

  const decoded = decodeBody(part.body, part.headers);
  if (type === 'text/html') return { text: null, html: decoded };
  if (type.startsWith('text/') || type === 'text/plain') return { text: decoded, html: null };
  return { text: null, html: null };
}

/* ------------------------------------------------------------------ */
/* Trimming the message down to what was actually written               */
/* ------------------------------------------------------------------ */

const QUOTED_HISTORY_MARKERS = [
  /^-{2,}\s*Original Message\s*-{2,}/im,
  /^_{10,}/m,
  /^From:.*\n(?:Sent|Date):.*\n(?:To|Cc):/im,
  /^On .{5,80}\bwrote:\s*$/im,
  /^\s*>{1,}\s?From:/im,
];

/**
 * Cut the forwarded history off the bottom.
 *
 * Only the newest message is the opportunity. Leaving the history on makes two
 * unrelated emails that quote the same original look like duplicates, and
 * wastes the parser's context on text it has already seen.
 */
export function stripQuotedHistory(body: string): string {
  let earliest = body.length;

  for (const marker of QUOTED_HISTORY_MARKERS) {
    const match = marker.exec(body);
    // Ignore a marker in the first few lines: that is a forward whose whole
    // point is the quoted message, so cutting there would leave nothing.
    if (match && match.index > 200 && match.index < earliest) {
      earliest = match.index;
    }
  }

  return body.slice(0, earliest).trim();
}

/** Drop the disclaimer blocks that make up half the length of a corporate email. */
export function stripSignatureNoise(body: string): string {
  const cutPoints = [
    /^\s*This e-?mail is for the sole use of the intended recipient/im,
    /^\s*This (e-?mail|message) (and any attachments? )?(is|are) confidential/im,
    /^\s*Registered in England and Wales with company number/im,
    /^\s*Please consider the environment before printing/im,
  ];

  let earliest = body.length;
  for (const marker of cutPoints) {
    const match = marker.exec(body);
    if (match && match.index > 100 && match.index < earliest) earliest = match.index;
  }

  return body.slice(0, earliest).trim();
}

/* ------------------------------------------------------------------ */
/* Entry point                                                         */
/* ------------------------------------------------------------------ */

function parseDateHeader(value: string | null): string | null {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

/** True when the text looks like a saved message rather than pasted prose. */
export function looksLikeEml(raw: string): boolean {
  const head = raw.slice(0, 2000);
  return /^(From|Received|Return-Path|Message-ID|MIME-Version|Subject|Date):/im.test(head);
}

/**
 * Parse a saved email. Anything that is not a saved message - a pasted email,
 * a plain text file - is passed through as its own body, so the same code path
 * serves both a dropped .eml and text somebody copied out of Outlook.
 */
export function parseEmail(raw: string): ParsedEmail {
  const warnings: string[] = [];

  if (!looksLikeEml(raw)) {
    return {
      from: null,
      subject: null,
      received_at: null,
      body: stripSignatureNoise(stripQuotedHistory(raw.trim())),
      warnings,
    };
  }

  const part = splitHeadersAndBody(raw);
  const { text, html } = extractBody(part);

  let body = text ?? '';
  if (!body.trim() && html) {
    body = htmlToText(html);
  } else if (!body.trim()) {
    warnings.push('No readable body was found in this message.');
    body = part.body;
  }

  return {
    from: decodeEncodedWords(headerValue(part.headers, 'from') ?? '') || null,
    subject: decodeEncodedWords(headerValue(part.headers, 'subject') ?? '') || null,
    received_at: parseDateHeader(headerValue(part.headers, 'date')),
    body: stripSignatureNoise(stripQuotedHistory(body.trim())),
    warnings,
  };
}
