import test from 'node:test';
import assert from 'node:assert/strict';
import { createVeraClient } from '../src/client.js';

test('T2 — Public RPC Live Integration (All Methods)', async (t) => {
  const client = createVeraClient();

  await t.test('getBlockNumber matches eth_blockNumber', async () => {
    const veraBlockNum = await client.getBlockNumber();
    assert.ok(typeof veraBlockNum === 'number', 'Block number must be a number');
    assert.ok(veraBlockNum >= 36, `Block height must be at least 36 (got ${veraBlockNum})`);

    // Verify eth_blockNumber matches
    const ethHex = await (client as any).rpcCall('eth_blockNumber');
    const ethBlockNum = parseInt(ethHex, 16);
    // Allow for a difference of at most 1 block if block was mined between calls
    assert.ok(
      Math.abs(veraBlockNum - ethBlockNum) <= 1,
      `vera_blockNumber (${veraBlockNum}) must match eth_blockNumber (${ethBlockNum})`
    );
  });

  await t.test('getValidators returns allowlist with 3 entries and BigInt stakes', async () => {
    const valData = await client.getValidators();
    assert.ok(Array.isArray(valData.allowlist), 'allowlist must be an array');
    assert.equal(valData.allowlist.length, 3, 'allowlist must have 3 entries');

    assert.equal(typeof valData.totalStake, 'bigint', 'totalStake must be BigInt');
    assert.equal(typeof valData.activeTotalStake, 'bigint', 'activeTotalStake must be BigInt');
    assert.equal(typeof valData.minValidatorStake, 'bigint', 'minValidatorStake must be BigInt');
    assert.ok(valData.activeValidators.length >= 2, 'Must have at least 2 active validators');

    for (const v of valData.activeValidators) {
      assert.equal(typeof v.stake, 'bigint', 'Validator stake must be BigInt');
      assert.ok(v.stake >= 32000000000000000000n, 'Validator stake must be at least 32 VERA');
    }
  });

  await t.test('getAccount on canonical test vector returns balance as BigInt', async () => {
    const testAddr = '0x19bca81ccf1752528f1ee5d15fde1eebe9012c8fc8f76654d51b4304b61ebf2e';
    const acc = await client.getAccount(testAddr);

    assert.equal(typeof acc.balance, 'bigint', 'Balance must be BigInt');
    assert.ok(acc.balance >= 32000000000000000000n, 'Balance must be at least 32 VERA');
    assert.equal(typeof acc.nonce, 'number', 'Nonce must be a number');
  });

  await t.test('isAllowlisted returns true for allowlisted address and false for unauthorized', async () => {
    const pedrofmpNative = '0x19bca81ccf1752528f1ee5d15fde1eebe9012c8fc8f76654d51b4304b61ebf2e';
    const pedrofmpEvm = '0x5fdE1EEBE9012c8Fc8f76654d51B4304B61EBf2E';
    const unauthorized = '0x0000000000000000000000000000000000000000';

    assert.equal(await client.isAllowlisted(pedrofmpNative), true, 'Native address must be recognized as allowlisted');
    assert.equal(await client.isAllowlisted(pedrofmpEvm), true, 'Derived EVM address must be recognized as allowlisted');
    assert.equal(await client.isAllowlisted(unauthorized), false, 'Unauthorized address must return false');
  });

  await t.test('getStatus returns live network status', async () => {
    const status = await client.getStatus();
    assert.equal(status.chainId, 'vera-testnet-1');
    assert.ok(status.height >= 36);
    assert.ok(status.activeValidators >= 2);
    assert.ok(status.totalStake >= 64);
  });

  await t.test('getNodeAttestation returns binary SHA-256 and match status', async () => {
    const att = await client.getNodeAttestation();
    assert.equal(att.integrityStatus, 'match');
    assert.equal(att.selfReportedBinarySha256, '0xd4a3e866272fd516683d7d1beca71603ab55319bd4841ed1e384c98813c2e638');
    assert.equal(att.chainId, '0x14709');
  });

  await t.test('getProof returns CSMT proof for account', async () => {
    const testAddr = '0x19bca81ccf1752528f1ee5d15fde1eebe9012c8fc8f76654d51b4304b61ebf2e';
    const proof = await client.getProof(testAddr);
    assert.ok(Array.isArray(proof.siblings), 'siblings must be an array of branch nodes');
    assert.ok(Array.isArray(proof.value_hash), 'value_hash must be present');
  });

  await t.test('getRecentBlocks and getRecentTransactions return valid arrays', async () => {
    const blocks = await client.getRecentBlocks(3);
    assert.ok(Array.isArray(blocks) && blocks.length > 0);
    assert.ok(blocks[0].height >= 1, 'Block height must be >= 1');

    const txs = await client.getRecentTransactions(3);
    assert.ok(Array.isArray(txs) && txs.length > 0);
    assert.ok(txs[0].hash.startsWith('0x'));
  });

  await t.test('getBlockByNumber returns block header and transactions', async () => {
    const block1 = await client.getBlockByNumber(1, false);
    assert.ok(block1 !== null, 'Block #1 must exist');
    assert.equal(block1.header.height, 1, 'Header height must be 1');
  });
});
