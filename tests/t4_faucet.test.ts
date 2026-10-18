import test from 'node:test';
import assert from 'node:assert/strict';
import { requestFaucet } from '../src/faucet.js';
import { VeraFaucetError, VeraValidationError } from '../src/errors.js';
import { getSharedTestWallet } from './helpers/testWallet.js';

test('T4 — Testnet Faucet Integration & Rate Limiting', async (t) => {
  await t.test('Missing or invalid address throws VeraValidationError', async () => {
    await assert.rejects(
      async () => requestFaucet(''),
      VeraValidationError,
      'Empty address must throw VeraValidationError'
    );

    await assert.rejects(
      async () => requestFaucet('0x123'),
      VeraValidationError,
      'Short invalid address must throw VeraValidationError'
    );
  });

  await t.test('Live faucet claim (exactly 1 VERA) and typed 24h rate-limit verification', async () => {
    // 1. Claim exactly 1.0 VERA for the shared ephemeral test wallet
    const { wallet, claim } = await getSharedTestWallet();

    assert.ok(claim.txHash.startsWith('0x'), 'txHash must be a valid hex hash');
    assert.equal(claim.amount, '1.0 VERA', 'Claim amount must be 1.0 VERA');
    assert.equal(claim.recipient.toLowerCase(), wallet.address.toLowerCase());

    // 2. Immediately attempt a 2nd claim for the same wallet
    // Must be rejected with HTTP 429 and typed VeraFaucetError
    await assert.rejects(
      async () => requestFaucet(wallet.address),
      (err: unknown) => {
        assert.ok(err instanceof VeraFaucetError, 'Must be VeraFaucetError');
        assert.equal(err.isRateLimited, true, 'isRateLimited must be true');
        assert.ok(
          typeof err.retryAfterSeconds === 'number' && err.retryAfterSeconds > 0,
          'retryAfterSeconds must be a positive integer'
        );
        assert.match(err.message, /rate limit/i);
        return true;
      },
      'Second claim for the same wallet must throw typed VeraFaucetError with rate limit'
    );
  });
});
