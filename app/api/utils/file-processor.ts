import * as mammoth from 'mammoth';

export const SUPPORTED_EXTENSIONS = ['.txt', '.docx'] as const;

export function isSupportedFileName(fileName: string): boolean {
  const lower = fileName.toLowerCase();
  return SUPPORTED_EXTENSIONS.some((ext) => lower.endsWith(ext));
}

/**
 * Read transcript text from an uploaded .txt or .docx file.
 */
export async function readFileContent(file: File): Promise<string> {
  const fileName = file.name.toLowerCase();
  const arrayBuffer = await file.arrayBuffer();

  if (fileName.endsWith('.txt')) {
    try {
      return new TextDecoder('utf-8', { fatal: true }).decode(arrayBuffer).replace(/^﻿/, '');
    } catch {
      // Not valid UTF-8: fall back to Latin-1, as the original app did.
      return new TextDecoder('iso-8859-1').decode(arrayBuffer);
    }
  }

  if (fileName.endsWith('.docx')) {
    // mammoth's Node build expects a Buffer; `arrayBuffer` is browser-only.
    const result = await mammoth.extractRawText({ buffer: Buffer.from(arrayBuffer) });
    return result.value;
  }

  throw new Error('Unsupported file type. Please upload a .txt or .docx file.');
}

/**
 * Split text into chunks of roughly `maxTokens` tokens (about 4 characters per token).
 */
export function chunkText(text: string, maxTokens: number = 80000): string[] {
  const words = text.split(/\s+/).filter(Boolean);
  const chunks: string[] = [];
  let currentChunk: string[] = [];
  let currentTokens = 0;

  for (const word of words) {
    currentTokens += Math.ceil(word.length / 4);
    currentChunk.push(word);

    if (currentTokens >= maxTokens) {
      chunks.push(currentChunk.join(' '));
      currentChunk = [];
      currentTokens = 0;
    }
  }

  if (currentChunk.length > 0) {
    chunks.push(currentChunk.join(' '));
  }

  return chunks;
}
