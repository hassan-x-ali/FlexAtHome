/**
 * Deterministic identifiers.
 *
 * The exercise catalog is identical in both backends, so an exercise must have
 * the same id in localStorage and in Postgres. Catalog ids are therefore
 * derived from the slug rather than generated, which also makes the seed
 * idempotent and keeps a locally-written plan referring to the right exercise.
 *
 * User-owned rows use random UUIDs, so their ids never leak a count.
 */

/**
 * SHA-1, as required by UUID version 5.
 *
 * Implemented here rather than imported so the identical algorithm runs in the
 * browser bundle and in the seed script — two implementations of the same
 * derivation are two chances to disagree.
 *
 * SHA-1 is used for name-based UUIDs, not for security. This is not a
 * security boundary; it only needs to be deterministic and collision-free.
 */
const sha1 = (input: Uint8Array): Uint8Array => {
  const h = new Uint32Array([
    0x67452301, 0xefcdab89, 0x98badcfe, 0x10325476, 0xc3d2e1f0,
  ]);

  // Pad to a multiple of 64 bytes: 0x80, zeros, then a 64-bit length.
  const paddedLength = ((input.length + 8) >> 6) * 64 + 64;
  const padded = new Uint8Array(paddedLength);
  padded.set(input);
  padded[input.length] = 0x80;

  const view = new DataView(padded.buffer);
  // Bit length as a 64-bit big-endian integer. Split to stay exact past 2^32.
  const bitLength = input.length * 8;
  view.setUint32(paddedLength - 8, Math.floor(bitLength / 0x100000000), false);
  view.setUint32(paddedLength - 4, bitLength >>> 0, false);

  const w = new Uint32Array(80);

  for (let offset = 0; offset < paddedLength; offset += 64) {
    for (let i = 0; i < 16; i += 1) {
      w[i] = view.getUint32(offset + i * 4, false);
    }
    for (let i = 16; i < 80; i += 1) {
      const x = w[i - 3]! ^ w[i - 8]! ^ w[i - 14]! ^ w[i - 16]!;
      w[i] = (x << 1) | (x >>> 31);
    }

    let [a, b, c, d, e] = [h[0]!, h[1]!, h[2]!, h[3]!, h[4]!];

    for (let i = 0; i < 80; i += 1) {
      let f: number;
      let k: number;
      if (i < 20) {
        f = (b & c) | (~b & d);
        k = 0x5a827999;
      } else if (i < 40) {
        f = b ^ c ^ d;
        k = 0x6ed9eba1;
      } else if (i < 60) {
        f = (b & c) | (b & d) | (c & d);
        k = 0x8f1bbcdc;
      } else {
        f = b ^ c ^ d;
        k = 0xca62c1d6;
      }
      const temp = (((a << 5) | (a >>> 27)) + f + e + k + w[i]!) >>> 0;
      e = d;
      d = c;
      c = (b << 30) | (b >>> 2);
      b = a;
      a = temp;
    }

    h[0] = (h[0]! + a) >>> 0;
    h[1] = (h[1]! + b) >>> 0;
    h[2] = (h[2]! + c) >>> 0;
    h[3] = (h[3]! + d) >>> 0;
    h[4] = (h[4]! + e) >>> 0;
  }

  const out = new Uint8Array(20);
  const outView = new DataView(out.buffer);
  for (let i = 0; i < 5; i += 1) outView.setUint32(i * 4, h[i]!, false);
  return out;
};

const encoder = new TextEncoder();

/** RFC 4122 namespace for fully-qualified domain names. */
const NAMESPACE_DNS = '6ba7b810-9dad-11d1-80b4-00c04fd430c8';

const uuidToBytes = (uuid: string): Uint8Array => {
  const hex = uuid.replace(/-/g, '');
  const bytes = new Uint8Array(16);
  for (let i = 0; i < 16; i += 1) {
    bytes[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16);
  }
  return bytes;
};

const toHex = (bytes: Uint8Array): string =>
  Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');

/** A stable v5 UUID for `name` within `namespace`. */
const uuidV5 = (namespace: string, name: string): string => {
  const namespaceBytes = uuidToBytes(namespace);
  const nameBytes = encoder.encode(name);

  const buffer = new Uint8Array(namespaceBytes.length + nameBytes.length);
  buffer.set(namespaceBytes, 0);
  buffer.set(nameBytes, namespaceBytes.length);

  const bytes = sha1(buffer).slice(0, 16);
  bytes[6] = (bytes[6]! & 0x0f) | 0x50; // version 5
  bytes[8] = (bytes[8]! & 0x3f) | 0x80; // RFC 4122 variant

  const hex = toHex(bytes);
  return [
    hex.slice(0, 8),
    hex.slice(8, 12),
    hex.slice(12, 16),
    hex.slice(16, 20),
    hex.slice(20, 32),
  ].join('-');
};

/** The catalog id for an exercise slug. Identical in every environment. */
export const exerciseId = (slug: string): string => uuidV5(NAMESPACE_DNS, `flexat:exercise:${slug}`);

/** A random v4 UUID, for user-owned rows. */
export const newId = (): string => uuidV5(NAMESPACE_DNS, `flexat:random:${randomSeed()}`);

const randomSeed = (): string => {
  const bytes = new Uint8Array(16);
  if (typeof crypto !== 'undefined' && 'getRandomValues' in crypto) {
    crypto.getRandomValues(bytes);
  } else {
    for (let i = 0; i < 16; i += 1) bytes[i] = Math.floor(Math.random() * 256);
  }
  return toHex(bytes);
};

/** Fixed id for the synthetic local user. */
export const LOCAL_USER_ID = 'local_user';

export const nowIso = (): string => new Date().toISOString();
