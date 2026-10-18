import test from 'node:test';
import assert from 'node:assert/strict';
import { formatVera, parseVera } from '../src/units.js';
import { VeraValidationError } from '../src/errors.js';

test('T3 — Unit Conversions (parseVera & formatVera)', async (t) => {
  await t.test('Exact round-trips without float errors', () => {
    // 0
    assert.equal(parseVera('0'), 0n);
    assert.equal(formatVera(0n), '0');
    assert.equal(formatVera('0'), '0');
    assert.equal(formatVera(0), '0');

    // 1 wei
    const oneWei = 1n;
    assert.equal(formatVera(oneWei), '0.000000000000000001');
    assert.equal(parseVera('0.000000000000000001'), oneWei);

    // 1.5 VERA
    const onePointFive = 1500000000000000000n;
    assert.equal(parseVera('1.5'), onePointFive);
    assert.equal(formatVera(onePointFive), '1.5');

    // 963.123456789012345678 VERA (full 18 decimals)
    const exact18 = 963123456789012345678n;
    const exactStr = '963.123456789012345678';
    assert.equal(parseVera(exactStr), exact18);
    assert.equal(formatVera(exact18), exactStr);

    // Large amounts (100,000,000 VERA)
    const hundredMillion = 100000000n * 10n ** 18n;
    assert.equal(parseVera('100000000'), hundredMillion);
    assert.equal(formatVera(hundredMillion), '100000000');
  });

  await t.test('maxDecimals option formatting', () => {
    const val = 1234567890123456789n; // 1.234567890123456789
    assert.equal(formatVera(val, 2), '1.23');
    assert.equal(formatVera(val, 4), '1.2345');
    assert.equal(formatVera(val, 0), '1');
  });

  await t.test('Strict rejection of invalid inputs', () => {
    // Scientific notation
    assert.throws(() => parseVera('1e18'), VeraValidationError);
    assert.throws(() => parseVera('1E18'), VeraValidationError);
    assert.throws(() => parseVera('1.5e-2'), VeraValidationError);

    // Negative numbers
    assert.throws(() => parseVera('-1'), VeraValidationError);
    assert.throws(() => parseVera('-0.5'), VeraValidationError);
    assert.throws(() => formatVera(-1n), VeraValidationError);

    // Exceeding 18 decimals (19 decimal places)
    assert.throws(() => parseVera('0.0000000000000000001'), VeraValidationError);
    assert.throws(() => parseVera('1.1234567890123456789'), VeraValidationError);

    // Malformed strings
    assert.throws(() => parseVera('abc'), VeraValidationError);
    assert.throws(() => parseVera(''), VeraValidationError);
    assert.throws(() => parseVera('.'), VeraValidationError);
    assert.throws(() => parseVera('1.2.3'), VeraValidationError);
    assert.throws(() => parseVera('1,5'), VeraValidationError);
    assert.throws(() => parseVera('+5'), VeraValidationError);
    assert.throws(() => parseVera(null as any), VeraValidationError);
  });
});
