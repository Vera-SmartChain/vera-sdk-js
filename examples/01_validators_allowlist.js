import { createVeraClient, formatVera, toEvmAddress } from '../src/index.js';
async function main() {
    console.log('=== VERA SmartChain — Validators and Allowlist Example ===\n');
    const client = createVeraClient();
    // 1. Fetch network status
    const status = await client.getStatus();
    console.log(`Current Block Height: #${status.height}`);
    console.log(`Active Validators: ${status.activeValidators}`);
    console.log(`Total Stake: ${status.totalStake} VERA\n`);
    // 2. Fetch validator set details
    const { allowlist, activeValidators, minValidatorStake, totalStake } = await client.getValidators();
    console.log(`Total Staked (wei): ${totalStake.toString()} wei (${formatVera(totalStake)} VERA)`);
    console.log(`Min Validator Stake: ${formatVera(minValidatorStake)} VERA\n`);
    console.log('--- Active Validators ---');
    for (const v of activeValidators) {
        const evm = toEvmAddress(v.address);
        console.log(`• Address (32-byte): ${v.address}`);
        console.log(`  EVM Address:       ${evm}`);
        console.log(`  Stake:             ${formatVera(v.stake)} VERA`);
        console.log(`  Missed Blocks:     ${v.missedBlocks}\n`);
    }
    console.log('--- Validator Allowlist ---');
    for (const addr of allowlist) {
        const isAllowed = await client.isAllowlisted(addr);
        console.log(`• ${addr} => Allowlisted: ${isAllowed}`);
    }
}
main().catch(console.error);
