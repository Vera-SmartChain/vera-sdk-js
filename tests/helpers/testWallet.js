import { Wallet } from 'ethers';
import { requestFaucet } from '../../src/faucet.js';
let sharedWallet = null;
let sharedClaim = null;
/**
 * Returns a funded ephemeral test wallet for the test suite.
 * The wallet is funded at most ONCE via the official faucet,
 * guaranteeing the test suite never spends more than 1 VERA total.
 */
export async function getSharedTestWallet() {
    if (sharedWallet && sharedClaim) {
        return { wallet: sharedWallet, claim: sharedClaim };
    }
    // Create ephemeral random wallet (in memory only, never saved to repo)
    sharedWallet = Wallet.createRandom();
    // Claim 1.0 VERA from the official testnet faucet
    sharedClaim = await requestFaucet(sharedWallet.address);
    // Wait a short moment for block inclusion
    await new Promise((r) => setTimeout(r, 4000));
    return { wallet: sharedWallet, claim: sharedClaim };
}
