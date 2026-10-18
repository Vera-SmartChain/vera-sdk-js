import {
  createVeraClient,
  formatVera,
  requestFaucet,
  toEvmAddress,
  VeraFaucetError,
} from '../src/index.js';

async function main() {
  console.log('=== VERA SmartChain — Account Balance & Faucet Example ===\n');

  const client = createVeraClient();

  // Test native address
  const nativeAddr = '0x19bca81ccf1752528f1ee5d15fde1eebe9012c8fc8f76654d51b4304b61ebf2e';
  const evmAddr = toEvmAddress(nativeAddr);

  console.log(`Native VERA Address: ${nativeAddr}`);
  console.log(`Derived EVM Address:  ${evmAddr}\n`);

  // 1. Query account on-chain
  const account = await client.getAccount(nativeAddr);
  console.log(`Account Balance (wei): ${account.balance.toString()} wei`);
  console.log(`Account Balance (VERA): ${formatVera(account.balance)} VERA`);
  console.log(`Account Nonce:         ${account.nonce}\n`);

  // 2. Request faucet (handles rate limiting gracefully)
  console.log(`Requesting testnet faucet for ${evmAddr}...`);
  try {
    const claim = await requestFaucet(evmAddr);
    console.log(`Faucet claim successful!`);
    console.log(`• Tx Hash:   ${claim.txHash}`);
    console.log(`• Amount:    ${claim.amount}`);
    console.log(`• Recipient: ${claim.recipient}`);
  } catch (err) {
    if (err instanceof VeraFaucetError && err.isRateLimited) {
      console.log(`Faucet rate limit: ${err.message}`);
      if (err.retryAfterSeconds) {
        console.log(`Please wait ${err.retryAfterSeconds}s before claiming again.`);
      }
    } else {
      console.log(`Faucet error: ${(err as Error).message}`);
    }
  }
}

main().catch(console.error);
