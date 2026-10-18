import { VeraValidationError } from './errors.js';

const WEI_PER_VERA = 10n ** 18n;
const STRICT_DECIMAL_REGEX = /^(0|[1-9]\d*)(\.\d+)?$/;

/**
 * Converts a decimal VERA string into native wei (BigInt).
 * Strict parsing with zero floating-point arithmetic.
 *
 * @param value String representing VERA amount (e.g. "1.5", "0.000000000000000001").
 * @returns Amount in wei as BigInt.
 * @throws {VeraValidationError} on invalid number, scientific notation, negative numbers, or >18 decimals.
 */
export function parseVera(value: string): bigint {
  if (typeof value !== 'string') {
    throw new VeraValidationError('Value must be a string');
  }

  const trimmed = value.trim();

  // Reject empty string
  if (trimmed.length === 0) {
    throw new VeraValidationError('Cannot parse empty string as VERA amount');
  }

  // Reject scientific notation, negative numbers, and non-decimal numbers
  if (!STRICT_DECIMAL_REGEX.test(trimmed)) {
    throw new VeraValidationError(
      `Invalid VERA amount format: "${value}". Must be an unsigned decimal string without scientific notation.`
    );
  }

  const parts = trimmed.split('.');
  const integerPart = BigInt(parts[0]);

  if (parts.length === 1) {
    return integerPart * WEI_PER_VERA;
  }

  const fractionPart = parts[1];
  if (fractionPart.length > 18) {
    throw new VeraValidationError(
      `Fractional part exceeds 18 decimal places (${fractionPart.length} digits): "${value}"`
    );
  }

  const paddedFraction = fractionPart.padEnd(18, '0');
  const fractionWei = BigInt(paddedFraction);

  return integerPart * WEI_PER_VERA + fractionWei;
}

/**
 * Formats an amount in wei into a human-readable VERA string.
 * Uses exact BigInt math to guarantee zero precision loss.
 *
 * @param wei Amount in wei (BigInt, string of digits, or integer number).
 * @param maxDecimals Optional maximum decimal places to display (defaults to full precision up to 18).
 * @returns Exact decimal string representation in VERA (e.g. "1.5", "0").
 * @throws {VeraValidationError} on negative or invalid non-integer inputs.
 */
export function formatVera(wei: bigint | string | number, maxDecimals?: number): string {
  let value: bigint;

  if (typeof wei === 'bigint') {
    value = wei;
  } else if (typeof wei === 'string') {
    const trimmed = wei.trim();
    if (!/^\d+$/.test(trimmed)) {
      throw new VeraValidationError(`Invalid wei value: "${wei}". Expected unsigned integer string.`);
    }
    value = BigInt(trimmed);
  } else if (typeof wei === 'number') {
    if (!Number.isSafeInteger(wei) || wei < 0) {
      throw new VeraValidationError(`Invalid wei number: ${wei}. Must be a non-negative safe integer.`);
    }
    value = BigInt(wei);
  } else {
    throw new VeraValidationError('Wei value must be a bigint, string, or integer number');
  }

  if (value < 0n) {
    throw new VeraValidationError(`Negative wei value not allowed: ${value}`);
  }

  const integerPart = value / WEI_PER_VERA;
  const remainder = value % WEI_PER_VERA;

  if (remainder === 0n) {
    return integerPart.toString();
  }

  let fractionStr = remainder.toString().padStart(18, '0');

  // Strip trailing zeros
  fractionStr = fractionStr.replace(/0+$/, '');

  if (typeof maxDecimals === 'number') {
    if (maxDecimals < 0) {
      throw new VeraValidationError('maxDecimals cannot be negative');
    }
    if (maxDecimals === 0) {
      return integerPart.toString();
    }
    fractionStr = fractionStr.slice(0, maxDecimals).replace(/0+$/, '');
    if (fractionStr.length === 0) {
      return integerPart.toString();
    }
  }

  return `${integerPart.toString()}.${fractionStr}`;
}
