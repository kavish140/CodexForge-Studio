import LZString from 'lz-string';
import type { LanguageId, WebCodeBundle } from '../types/playground';

export interface SharePayload {
  language: LanguageId;
  code: string;
  webCode?: WebCodeBundle;
  stdin?: string;
}

const HASH_PREFIX = '#code=';

export function encodeShareUrl(payload: SharePayload): string {
  const json = JSON.stringify(payload);
  const compressed = LZString.compressToEncodedURIComponent(json);
  const base = `${window.location.origin}${window.location.pathname}`;
  return `${base}${HASH_PREFIX}${compressed}`;
}

export function decodeShareFromHash(hash: string): SharePayload | null {
  if (!hash.startsWith(HASH_PREFIX)) return null;
  const encoded = hash.slice(HASH_PREFIX.length);
  if (!encoded) return null;
  try {
    const json = LZString.decompressFromEncodedURIComponent(encoded);
    if (!json) return null;
    const parsed = JSON.parse(json) as Partial<SharePayload>;
    if (!parsed || typeof parsed.language !== 'string' || typeof parsed.code !== 'string') {
      return null;
    }
    return {
      language: parsed.language as LanguageId,
      code: parsed.code,
      webCode: parsed.webCode,
      stdin: typeof parsed.stdin === 'string' ? parsed.stdin : '',
    };
  } catch {
    return null;
  }
}
