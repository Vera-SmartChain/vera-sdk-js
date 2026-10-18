import test from 'node:test';
import assert from 'node:assert/strict';
import { getAddress } from 'ethers';
import { isVeraAddress, isEvmAddress, toChecksumAddress, toEvmAddress, } from '../src/addresses.js';
import { VeraValidationError } from '../src/errors.js';
test('T1 — Address Validation and Conversions', async (t) => {
    await t.test('Canonical test vector conversion matches ethers.getAddress', () => {
        const nativeVera = '0x19bca81ccf1752528f1ee5d15fde1eebe9012c8fc8f76654d51b4304b61ebf2e';
        const evmDerived = toEvmAddress(nativeVera);
        const expectedEvm = '0x5fdE1EEBE9012c8Fc8f76654d51B4304B61EBf2E';
        assert.equal(evmDerived, expectedEvm, 'Derived EVM address must match expected checksum');
        const ethersChecksum = getAddress('0x5fde1eebe9012c8fc8f76654d51b4304b61ebf2e');
        assert.equal(evmDerived, ethersChecksum, 'Checksum must match ethers.getAddress exactly');
    });
    await t.test('isVeraAddress strictly validates 32-byte (64 hex) addresses', () => {
        assert.equal(isVeraAddress('0x19bca81ccf1752528f1ee5d15fde1eebe9012c8fc8f76654d51b4304b61ebf2e'), true);
        assert.equal(isVeraAddress('0x19BCA81CCF1752528F1EE5D15FDE1EEBE9012C8FC8F76654D51B4304B61EBF2E'), true);
        // 63 hex chars (1 character short)
        assert.equal(isVeraAddress('0x19bca81ccf1752528f1ee5d15fde1eebe9012c8fc8f76654d51b4304b61ebf2'), false);
        // 65 hex chars (1 character long)
        assert.equal(isVeraAddress('0x19bca81ccf1752528f1ee5d15fde1eebe9012c8fc8f76654d51b4304b61ebf2eaa'), false);
        // Missing 0x prefix
        assert.equal(isVeraAddress('19bca81ccf1752528f1ee5d15fde1eebe9012c8fc8f76654d51b4304b61ebf2e'), false);
        // Non-hex character ('g')
        assert.equal(isVeraAddress('0x19bca81ccf1752528f1ee5d15fde1eebe9012c8fc8f76654d51b4304b61ebf2g'), false);
        // Non-string inputs
        assert.equal(isVeraAddress(null), false);
        assert.equal(isVeraAddress(123), false);
        assert.equal(isVeraAddress({}), false);
    });
    await t.test('isEvmAddress strictly validates 20-byte (40 hex) addresses', () => {
        assert.equal(isEvmAddress('0x5fdE1EEBE9012c8Fc8f76654d51B4304B61EBf2E'), true);
        assert.equal(isEvmAddress('0x5fde1eebe9012c8fc8f76654d51b4304b61ebf2e'), true);
        // 39 hex chars (1 short)
        assert.equal(isEvmAddress('0x5fde1eebe9012c8fc8f76654d51b4304b61ebf2'), false);
        // 41 hex chars (1 long)
        assert.equal(isEvmAddress('0x5fde1eebe9012c8fc8f76654d51b4304b61ebf2eaa'), false);
        // Missing 0x prefix
        assert.equal(isEvmAddress('5fde1eebe9012c8fc8f76654d51b4304b61ebf2e'), false);
        // Non-hex character ('z')
        assert.equal(isEvmAddress('0x5fde1eebe9012c8fc8f76654d51b4304b61ebf2z'), false);
    });
    await t.test('toEvmAddress rejects invalid native addresses with VeraValidationError', () => {
        assert.throws(() => toEvmAddress('0x123'), VeraValidationError);
        assert.throws(() => toEvmAddress('not-an-address'), VeraValidationError);
        assert.throws(() => toEvmAddress('0x5fde1eebe9012c8fc8f76654d51b4304b61ebf2e'), VeraValidationError); // 20-byte, not 32-byte
        assert.throws(() => toEvmAddress(''), VeraValidationError);
    });
    await t.test('toChecksumAddress validates and formats with EIP-55', () => {
        const raw = '0x5fde1eebe9012c8fc8f76654d51b4304b61ebf2e';
        assert.equal(toChecksumAddress(raw), '0x5fdE1EEBE9012c8Fc8f76654d51B4304B61EBf2E');
        assert.equal(toChecksumAddress(raw.toUpperCase()), '0x5fdE1EEBE9012c8Fc8f76654d51B4304B61EBf2E');
        assert.throws(() => toChecksumAddress('0x123'), VeraValidationError);
    });
});
