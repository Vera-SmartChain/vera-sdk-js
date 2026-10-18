import { keccak256Hex } from './crypto/keccak.js';
import { VeraValidationError } from './errors.js';

const VERA_ADDRESS_REGEX = /^0x[0-9a-fA-F]{64}$/;
const EVM_ADDRESS_REGEX = /^0x[0-9a-fA-F]{40}$/;

/**
 * Checks if a value is a valid 32-byte native VERA address (0x followed by 64 hex characters).
 */
export function isVeraAddress(address: unknown): address is `0x${string}` {
  return typeof address === 'string' && VERA_ADDRESS_REGEX.test(address);
}

/**
 * Checks if a value is a valid 20-byte EVM address (0x followed by 40 hex characters).
 */
export function isEvmAddress(address: unknown): address is `0x${string}` {
  return typeof address === 'string' && EVM_ADDRESS_REGEX.test(address);
}

/**
 * Formats a 20-byte EVM address using EIP-55 mixed-case checksum.
 * @param address 20-byte EVM address (with or without 0x prefix).
 * @returns Checksummed 0x-prefixed EVM address.
 * @throws {VeraValidationError} if address is not a valid 20-byte hex string.
 */
export function toChecksumAddress(address: string): `0x${string}` {
  if (typeof address !== 'string') {
    throw new VeraValidationError('Address must be a string');
  }

  const clean = address.toLowerCase().replace(/^0x/, '');
  if (!/^[0-9a-f]{40}$/.test(clean)) {
    throw new VeraValidationError(`Invalid EVM address format: "${address}". Expected 20 bytes (40 hex characters).`);
  }

  const hash = keccak256Hex(clean);
  let ret = '0x';

  for (let i = 0; i < 40; i++) {
    const char = clean[i];
    const nibble = parseInt(hash[i], 16);
    if (nibble >= 8) {
      ret += char.toUpperCase();
    } else {
      ret += char;
    }
  }

  return ret as `0x${string}`;
}

/**
 * Derives the canonical 20-byte EVM address from a 32-byte native VERA address.
 * Takes the last 20 bytes (last 40 hex characters) and formats them with EIP-55 checksum.
 *
 * NOTE: EVM address -> VERA address conversion is non-invertible (12 bytes are discarded),
 * and therefore cannot be performed in reverse.
 *
 * @param veraAddress 32-byte native VERA address (0x + 64 hex characters).
 * @returns EIP-55 checksummed 20-byte EVM address.
 * @throws {VeraValidationError} if veraAddress is not a valid 32-byte VERA address.
 */
export function toEvmAddress(veraAddress: string): `0x${string}` {
  if (typeof veraAddress !== 'string') {
    throw new VeraValidationError('Address must be a string');
  }

  if (!isVeraAddress(veraAddress)) {
    throw new VeraValidationError(
      `Invalid native VERA address: "${veraAddress}". Expected 32 bytes (0x followed by 64 hex characters).`
    );
  }

  // The EVM address corresponds to the last 20 bytes (40 hex chars) of the 32-byte VERA address.
  // In a 66-character string ('0x' + 64 hex chars), the last 40 characters start at index 26.
  const evmHex = veraAddress.slice(26);
  return toChecksumAddress(`0x${evmHex}`);
}
