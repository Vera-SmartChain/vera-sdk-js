import fs from 'node:fs';
import { Wallet, HDNodeWallet } from 'ethers';
import { requestFaucet } from '../../src/faucet.js';
import type { FaucetResponse } from '../../src/types.js';

const cacheFile = 'C:/Users/Carlos/.gemini/antigravity-ide/brain/b49f9319-ee9a-48b5-8d70-5f77ba1ba75c/scratch/ephemeral_test_wallet.json';

export interface SharedWalletData {
  address: string;
  privateKey: string;
  claim: FaucetResponse;
}

/**
 * Returns a funded ephemeral test wallet for the test suite.
 * The wallet is funded at most ONCE via the official faucet,
 * guaranteeing the test suite never spends more than 1 VERA total.
 */
export async function getSharedTestWallet(): Promise<{ wallet: Wallet | HDNodeWallet; claim: FaucetResponse }> {
  // Check if already created and cached in scratch
  if (fs.existsSync(cacheFile)) {
    try {
      const data: SharedWalletData = JSON.parse(fs.readFileSync(cacheFile, 'utf8'));
      const wallet = new Wallet(data.privateKey);
      return { wallet, claim: data.claim };
    } catch {
      // ignore read error
    }
  }

  // Create ephemeral random wallet (in scratch memory only)
  const wallet = Wallet.createRandom();

  // Claim 1.0 VERA from the official testnet faucet
  const claim = await requestFaucet(wallet.address);

  // Cache in scratch dir (outside the repository)
  const data: SharedWalletData = {
    address: wallet.address,
    privateKey: wallet.privateKey,
    claim,
  };
  fs.writeFileSync(cacheFile, JSON.stringify(data, null, 2));

  // Wait a short moment for block inclusion
  await new Promise((r) => setTimeout(r, 4000));

  return { wallet, claim };
}
