import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { Wallet } from 'ethers';
import { requestFaucet } from '../../src/faucet.js';

const cacheFile = process.env.VERA_TEST_WALLET_FILE || path.join(os.tmpdir(), 'vera_ephemeral_test_wallet.json');

/**
 * Returns a funded ephemeral test wallet for the test suite.
 * The wallet is funded at most ONCE via the official faucet,
 * guaranteeing the test suite never spends more than 1 VERA total.
 */
export async function getSharedTestWallet() {
  if (fs.existsSync(cacheFile)) {
    try {
      const data = JSON.parse(fs.readFileSync(cacheFile, 'utf8'));
      const wallet = new Wallet(data.privateKey);
      return { wallet, claim: data.claim };
    } catch {
      // ignore read error
    }
  }

  const wallet = Wallet.createRandom();
  const claim = await requestFaucet(wallet.address);

  const data = {
    address: wallet.address,
    privateKey: wallet.privateKey,
    claim,
  };
  fs.writeFileSync(cacheFile, JSON.stringify(data, null, 2));

  await new Promise((r) => setTimeout(r, 4000));

  return { wallet, claim };
}
