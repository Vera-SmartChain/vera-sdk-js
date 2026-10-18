import { isEvmAddress, isVeraAddress } from './addresses.js';
import { veraTestnet } from './chain.js';
import { VeraFaucetError, VeraValidationError } from './errors.js';
import type { FaucetOptions, FaucetResponse } from './types.js';

/**
 * Requests testnet VERA tokens from the official faucet.
 *
 * NOTE: Rate limited to 1.0 VERA per 24 hours per wallet address and per IP.
 * If the rate limit is exceeded, a typed VeraFaucetError with `isRateLimited: true`
 * and `retryAfterSeconds` will be thrown.
 *
 * @param address 20-byte EVM address or 32-byte native VERA address.
 * @param options Optional faucet configuration (custom URL or timeout).
 * @returns Faucet claim response with transaction hash.
 * @throws {VeraValidationError} if address format is invalid.
 * @throws {VeraFaucetError} on rate limit or faucet service errors.
 */
export async function requestFaucet(
  address: string,
  options: FaucetOptions = {}
): Promise<FaucetResponse> {
  if (typeof address !== 'string' || address.trim() === '') {
    throw new VeraValidationError("Field 'address' is required");
  }

  const cleanAddress = address.trim();
  if (!isVeraAddress(cleanAddress) && !isEvmAddress(cleanAddress)) {
    throw new VeraValidationError(
      `Invalid address format: "${address}". Must be a 20-byte EVM address (40 hex chars) or 32-byte native address (64 hex chars).`
    );
  }

  const faucetUrl = options.faucetUrl || veraTestnet.faucetUrls.default;
  const timeoutMs = options.timeoutMs ?? 15_000;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  let response: Response;
  try {
    response = await fetch(faucetUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify({ address: cleanAddress }),
      signal: controller.signal,
    });
  } catch (err: unknown) {
    clearTimeout(timeoutId);
    const isAbort = (err as { name?: string })?.name === 'AbortError';
    const msg = isAbort
      ? `Faucet request timed out after ${timeoutMs}ms (${faucetUrl})`
      : `Network error connecting to faucet (${faucetUrl}): ${(err as Error)?.message || String(err)}`;
    throw new VeraFaucetError(msg);
  } finally {
    clearTimeout(timeoutId);
  }

  let json: {
    status?: string;
    success?: boolean;
    error?: string;
    retry_after?: number;
    tx_hash?: string;
    amount?: string;
    wallet?: string;
    recipient?: string;
    faucet_sender?: string;
    network?: string;
    message?: string;
  };

  try {
    json = (await response.json()) as typeof json;
  } catch (err) {
    throw new VeraFaucetError(
      `Failed to parse response from faucet endpoint: ${(err as Error).message}`
    );
  }

  if (response.status === 429) {
    const retryAfter = typeof json.retry_after === 'number' ? json.retry_after : undefined;
    const msg =
      json.error ||
      `Rate limit exceeded: this wallet or IP has already claimed within the last 24 hours.${
        retryAfter ? ` Please wait ${retryAfter} seconds.` : ''
      }`;
    throw new VeraFaucetError(msg, retryAfter);
  }

  if (!response.ok || json.status === 'error' || !json.tx_hash) {
    throw new VeraFaucetError(
      json.error || `Faucet request failed with status ${response.status}: ${response.statusText}`
    );
  }

  return {
    txHash: json.tx_hash,
    amount: json.amount || '1.0 VERA',
    wallet: json.wallet || cleanAddress,
    recipient: json.recipient || cleanAddress,
    faucetSender: json.faucet_sender || '',
    network: json.network || 'VERA SmartChain Testnet (83721)',
    message: json.message || 'Transaction broadcasted to testnet.',
  };
}
