import {
  createPublicClient,
  createWalletClient,
  http,
  parseAbiItem,
} from 'viem';
import { generatePrivateKey, privateKeyToAccount } from 'viem/accounts';
import { formatVera, requestFaucet } from '../src/index.js';
import { veraTestnet } from '../src/viem.js';
import contractArtifact from './contracts/VeraTestToken.json' with { type: 'json' };

async function main() {
  console.log('=== VERA SmartChain — ERC-20 Lifecycle with viem ===\n');

  // 1. Initialize viem clients using exclusively the SDK's veraTestnet preset
  const publicClient = createPublicClient({
    chain: veraTestnet,
    transport: http(),
  });

  // Ephemeral test account (or passed via environment)
  const privateKey = (process.env.TEST_PRIVATE_KEY as `0x${string}`) || generatePrivateKey();
  const account = privateKeyToAccount(privateKey);

  const walletClient = createWalletClient({
    account,
    chain: veraTestnet,
    transport: http(),
  });

  console.log(`Deployer Address: ${account.address}`);

  // 2. Fund ephemeral deployer via official faucet if needed
  let balance = await publicClient.getBalance({ address: account.address });
  console.log(`Current Balance: ${formatVera(balance)} VERA`);

  if (balance < 10000000000000000n) {
    // < 0.01 VERA
    console.log(`Requesting 1.0 VERA from testnet faucet...`);
    const claim = await requestFaucet(account.address);
    console.log(`Faucet claim submitted: tx ${claim.txHash}`);

    // Wait for balance inclusion
    let retries = 0;
    while (balance === 0n && retries < 15) {
      await new Promise((r) => setTimeout(r, 2000));
      balance = await publicClient.getBalance({ address: account.address });
      retries++;
    }
    console.log(`Funded Balance: ${formatVera(balance)} VERA\n`);
  }

  // 3. Deploy ERC-20 Token (Supply: 1,000,000 VTT)
  const initialSupply = 1000000n * 10n ** 18n;
  console.log(`Deploying VeraTestToken (VTT, supply: 1,000,000)...`);

  const deployHash = await walletClient.deployContract({
    abi: contractArtifact.abi,
    bytecode: contractArtifact.bytecode as `0x${string}`,
    args: [initialSupply],
  });
  console.log(`Deploy tx submitted: ${deployHash}`);

  const deployReceipt = await publicClient.waitForTransactionReceipt({ hash: deployHash });
  const contractAddress = deployReceipt.contractAddress;
  if (!contractAddress) {
    throw new Error('Contract deployment failed: no contractAddress in receipt');
  }
  console.log(`Contract deployed at: ${contractAddress} (block #${deployReceipt.blockNumber})\n`);

  // 4. Read token parameters
  const [name, symbol, decimals, totalSupply, ownerBalance] = await Promise.all([
    publicClient.readContract({
      address: contractAddress,
      abi: contractArtifact.abi,
      functionName: 'name',
    }),
    publicClient.readContract({
      address: contractAddress,
      abi: contractArtifact.abi,
      functionName: 'symbol',
    }),
    publicClient.readContract({
      address: contractAddress,
      abi: contractArtifact.abi,
      functionName: 'decimals',
    }),
    publicClient.readContract({
      address: contractAddress,
      abi: contractArtifact.abi,
      functionName: 'totalSupply',
    }),
    publicClient.readContract({
      address: contractAddress,
      abi: contractArtifact.abi,
      functionName: 'balanceOf',
      args: [account.address],
    }),
  ]);

  console.log(`Token Name:         ${name}`);
  console.log(`Token Symbol:       ${symbol}`);
  console.log(`Token Decimals:     ${decimals}`);
  console.log(`Total Supply:       ${formatVera(totalSupply as bigint)} ${symbol}`);
  console.log(`Deployer Balance:   ${formatVera(ownerBalance as bigint)} ${symbol}\n`);

  // 5. Transfer 1,000 tokens to a recipient
  const recipient = '0x1111111111111111111111111111111111111111' as `0x${string}`;
  const transferAmount = 1000n * 10n ** 18n;
  console.log(`Transferring 1,000 ${symbol} to ${recipient}...`);

  const transferHash = await walletClient.writeContract({
    address: contractAddress,
    abi: contractArtifact.abi,
    functionName: 'transfer',
    args: [recipient, transferAmount],
  });
  console.log(`Transfer tx submitted: ${transferHash}`);

  const transferReceipt = await publicClient.waitForTransactionReceipt({ hash: transferHash });
  console.log(`Transfer confirmed in block #${transferReceipt.blockNumber}\n`);

  // 6. Query Transfer events via getLogs
  const logs = await publicClient.getLogs({
    address: contractAddress,
    event: parseAbiItem('event Transfer(address indexed from, address indexed to, uint256 value)'),
    fromBlock: deployReceipt.blockNumber,
    toBlock: transferReceipt.blockNumber,
  });

  console.log(`Retrieved ${logs.length} Transfer event log(s):`);
  for (const log of logs) {
    console.log(`• From: ${log.args.from} -> To: ${log.args.to} -> Value: ${formatVera(log.args.value || 0n)} ${symbol}`);
  }

  // 7. Check recipient balance
  const recipientBalance = (await publicClient.readContract({
    address: contractAddress,
    abi: contractArtifact.abi,
    functionName: 'balanceOf',
    args: [recipient],
  })) as bigint;
  console.log(`\nRecipient Final Balance: ${formatVera(recipientBalance)} ${symbol} (Expected: 1000.0)`);
}

main().catch(console.error);
