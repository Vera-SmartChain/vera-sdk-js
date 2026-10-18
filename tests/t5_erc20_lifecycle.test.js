import test from 'node:test';
import assert from 'node:assert/strict';
import { createPublicClient, createWalletClient, http, parseAbiItem, } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { veraTestnet } from '../src/viem.js';
import { formatVera } from '../src/units.js';
import { getSharedTestWallet } from './helpers/testWallet.js';
import contractArtifact from '../examples/contracts/VeraTestToken.json' with { type: 'json' };
test('T5 — Full ERC-20 Lifecycle with viem using exclusively veraTestnet preset', async (t) => {
    // 1. Initialize viem clients using ONLY the SDK's veraTestnet preset
    const publicClient = createPublicClient({
        chain: veraTestnet,
        transport: http(),
    });
    const { wallet } = await getSharedTestWallet();
    const account = privateKeyToAccount(wallet.privateKey);
    const walletClient = createWalletClient({
        account,
        chain: veraTestnet,
        transport: http(),
    });
    let balance = await publicClient.getBalance({ address: account.address });
    // Wait if block inclusion of faucet tx is still pending
    let attempts = 0;
    while (balance === 0n && attempts < 15) {
        await new Promise((r) => setTimeout(r, 2000));
        balance = await publicClient.getBalance({ address: account.address });
        attempts++;
    }
    assert.ok(balance > 0n, `Deployer account must be funded (got ${formatVera(balance)} VERA)`);
    let contractAddress;
    let deployBlockNumber;
    await t.test('Deploy ERC-20 token contract to VERA SmartChain Testnet', async () => {
        const initialSupply = 1000000n * 10n ** 18n; // 1,000,000 tokens
        const deployHash = await walletClient.deployContract({
            abi: contractArtifact.abi,
            bytecode: contractArtifact.bytecode,
            args: [initialSupply],
        });
        assert.ok(deployHash.startsWith('0x'), 'deployHash must be valid hex');
        const receipt = await publicClient.waitForTransactionReceipt({ hash: deployHash });
        assert.equal(receipt.status, 'success', 'Deployment transaction must succeed');
        assert.ok(receipt.contractAddress, 'Receipt must include contractAddress');
        contractAddress = receipt.contractAddress;
        deployBlockNumber = receipt.blockNumber;
    });
    await t.test('Read contract state (name, symbol, decimals, totalSupply, balanceOf)', async () => {
        const [name, symbol, decimals, totalSupply, deployerBalance] = await Promise.all([
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
        assert.equal(name, 'Vera Test Token');
        assert.equal(symbol, 'VTT');
        assert.equal(decimals, 18);
        assert.equal(totalSupply, 1000000n * 10n ** 18n);
        assert.equal(deployerBalance, 1000000n * 10n ** 18n);
    });
    let transferBlockNumber;
    const recipient = '0x1111111111111111111111111111111111111111';
    const transferAmount = 1000n * 10n ** 18n;
    await t.test('Execute ERC-20 transfer of 1,000 VTT tokens', async () => {
        const transferHash = await walletClient.writeContract({
            address: contractAddress,
            abi: contractArtifact.abi,
            functionName: 'transfer',
            args: [recipient, transferAmount],
        });
        assert.ok(transferHash.startsWith('0x'));
        const receipt = await publicClient.waitForTransactionReceipt({ hash: transferHash });
        assert.equal(receipt.status, 'success', 'Transfer transaction must succeed');
        transferBlockNumber = receipt.blockNumber;
        const recipientBal = (await publicClient.readContract({
            address: contractAddress,
            abi: contractArtifact.abi,
            functionName: 'balanceOf',
            args: [recipient],
        }));
        assert.equal(recipientBal, transferAmount, 'Recipient balance must reflect transfer');
    });
    await t.test('Query Transfer events via getLogs', async () => {
        const logs = await publicClient.getLogs({
            address: contractAddress,
            event: parseAbiItem('event Transfer(address indexed from, address indexed to, uint256 value)'),
            fromBlock: deployBlockNumber,
            toBlock: transferBlockNumber,
        });
        assert.ok(logs.length >= 2, `Expected at least 2 Transfer events (mint + transfer), got ${logs.length}`);
        // Check transfer log args
        const transferLog = logs[logs.length - 1];
        assert.equal(transferLog.args.from?.toLowerCase(), account.address.toLowerCase());
        assert.equal(transferLog.args.to?.toLowerCase(), recipient.toLowerCase());
        assert.equal(transferLog.args.value, transferAmount);
    });
});
