/**
 * Zero-dependency Keccak-256 implementation conforming to FIPS-202 / Ethereum specifications.
 */

const ROUND_CONSTANTS = [
  0x0000000000000001n, 0x0000000000008082n, 0x800000000000808an, 0x8000000080008000n,
  0x000000000000808bn, 0x0000000080000001n, 0x8000000080008081n, 0x8000000000008009n,
  0x000000000000008an, 0x0000000000000088n, 0x0000000080008009n, 0x000000008000000an,
  0x000000008000808bn, 0x800000000000008bn, 0x8000000000008089n, 0x8000000000008003n,
  0x8000000000008002n, 0x8000000000000080n, 0x000000000000800an, 0x800000008000000an,
  0x8000000080008081n, 0x8000000000008080n, 0x0000000080000001n, 0x8000000080008008n,
];

function rotl64(x: bigint, n: number): bigint {
  const s = BigInt(n % 64);
  if (s === 0n) return x;
  return ((x << s) | (x >> (64n - s))) & 0xffffffffffffffffn;
}

function keccakF1600(A: BigUint64Array): void {
  const C = new BigUint64Array(5);
  const D = new BigUint64Array(5);
  const B = new BigUint64Array(25);

  for (let round = 0; round < 24; round++) {
    // 1. Theta
    for (let x = 0; x < 5; x++) {
      C[x] = A[x] ^ A[x + 5] ^ A[x + 10] ^ A[x + 15] ^ A[x + 20];
    }
    for (let x = 0; x < 5; x++) {
      D[x] = C[(x + 4) % 5] ^ rotl64(C[(x + 1) % 5], 1);
    }
    for (let i = 0; i < 25; i++) {
      A[i] ^= D[i % 5];
    }

    // 2. Rho and Pi
    let x = 1;
    let y = 0;
    let current = A[1];
    for (let t = 0; t < 24; t++) {
      const shift = ((t + 1) * (t + 2) / 2) % 64;
      const nextX = y;
      const nextY = (2 * x + 3 * y) % 5;
      const nextIdx = nextX + 5 * nextY;
      const temp = A[nextIdx];
      A[nextIdx] = rotl64(current, shift);
      current = temp;
      x = nextX;
      y = nextY;
    }

    // 3. Chi
    for (let i = 0; i < 25; i++) {
      B[i] = A[i];
    }
    for (let y = 0; y < 5; y++) {
      const y5 = y * 5;
      for (let x = 0; x < 5; x++) {
        A[x + y5] = B[x + y5] ^ ((~B[((x + 1) % 5) + y5]) & B[((x + 2) % 5) + y5]);
      }
    }

    // 4. Iota
    A[0] ^= ROUND_CONSTANTS[round];
  }
}

/**
 * Computes Keccak-256 hash of a string or Uint8Array.
 * @param data String (encoded as UTF-8) or Uint8Array to hash.
 * @returns 32-byte Uint8Array hash.
 */
export function keccak256(data: string | Uint8Array): Uint8Array {
  const bytes = typeof data === 'string' ? new TextEncoder().encode(data) : data;
  const rate = 136; // 1088 bits
  const state = new BigUint64Array(25);
  const stateBytes = new Uint8Array(state.buffer);

  let offset = 0;
  while (offset + rate <= bytes.length) {
    for (let i = 0; i < rate; i++) {
      stateBytes[i] ^= bytes[offset + i];
    }
    keccakF1600(state);
    offset += rate;
  }

  const remaining = bytes.length - offset;
  for (let i = 0; i < remaining; i++) {
    stateBytes[i] ^= bytes[offset + i];
  }
  stateBytes[remaining] ^= 0x01; // Pad start
  stateBytes[rate - 1] ^= 0x80; // Pad end
  keccakF1600(state);

  return new Uint8Array(stateBytes.buffer, 0, 32);
}

/**
 * Computes Keccak-256 hash and returns lowercase hex string (without 0x prefix).
 */
export function keccak256Hex(data: string | Uint8Array): string {
  const hash = keccak256(data);
  let hex = '';
  for (let i = 0; i < hash.length; i++) {
    hex += hash[i].toString(16).padStart(2, '0');
  }
  return hex;
}
