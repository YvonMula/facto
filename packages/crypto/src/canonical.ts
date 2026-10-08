import { concat, utf8 } from './encoding.js';
import type { Label } from './labels.js';

/** ADR 0003: canonical, length-prefixed signing input. */
export const SIGNING_FORMAT_VERSION = 1;
const MAGIC = utf8('facto-sig\u0000');

export type Field = string | number | Uint8Array | null;

function u16(n: number): Uint8Array {
  if (!Number.isInteger(n) || n < 0 || n > 0xffff) throw new Error('u16 out of range');
  return Uint8Array.of(n >> 8, n & 255);
}

function u32(n: number): Uint8Array {
  if (!Number.isInteger(n) || n < 0 || n > 0xffffffff) throw new Error('u32 out of range');
  return Uint8Array.of((n >>> 24) & 255, (n >>> 16) & 255, (n >>> 8) & 255, n & 255);
}

function fieldBytes(f: Field): Uint8Array {
  if (f === null) return new Uint8Array(0);
  if (f instanceof Uint8Array) return f;
  if (typeof f === 'number') {
    if (!Number.isSafeInteger(f) || f < 0) throw new Error('only non-negative integers can be signed');
    return utf8(String(f));
  }
  if (f !== f.normalize('NFC')) throw new Error('strings must be NFC before signing');
  return utf8(f);
}

export function signingInput(label: Label, fields: Field[]): Uint8Array {
  const labelBytes = utf8(label);
  const parts: Uint8Array[] = [MAGIC, Uint8Array.of(SIGNING_FORMAT_VERSION), u16(labelBytes.length), labelBytes, u16(fields.length)];
  for (const f of fields) {
    const b = fieldBytes(f);
    parts.push(u32(b.length), b);
  }
  return concat(...parts);
}
