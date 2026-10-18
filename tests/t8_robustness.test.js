import test from 'node:test';
import assert from 'node:assert/strict';
import { createVeraClient } from '../src/client.js';
import { VeraRpcError } from '../src/errors.js';
test('T8 — Robustness & Error Handling', async (t) => {
    await t.test('Unreachable RPC fails fast with VeraRpcError within timeout', async () => {
        // Port 59999 should be unreachable locally
        const client = createVeraClient({
            rpcUrl: 'http://127.0.0.1:59999',
            timeoutMs: 300,
        });
        const start = Date.now();
        await assert.rejects(async () => client.getBlockNumber(), (err) => {
            assert.ok(err instanceof VeraRpcError, 'Must be an instance of VeraRpcError');
            assert.match(err.message, /(network error|timed out|fetch failed|connect)/i);
            return true;
        }, 'Should throw VeraRpcError when RPC is unreachable');
        const duration = Date.now() - start;
        assert.ok(duration < 2000, `Request should abort quickly, took ${duration}ms`);
    });
    await t.test('JSON-RPC error response maps to VeraRpcError with code and message', async () => {
        const client = createVeraClient();
        // Call a nonexistent method
        await assert.rejects(async () => client.rpcCall('vera_nonexistentMethod', []), (err) => {
            assert.ok(err instanceof VeraRpcError, 'Must be VeraRpcError');
            assert.equal(err.method, 'vera_nonexistentMethod');
            // Standard JSON-RPC Method not found is -32601
            assert.ok(typeof err.code === 'number', 'Error code must be a number');
            assert.ok(err.message.length > 0, 'Error message must not be empty');
            return true;
        }, 'Nonexistent method must return typed VeraRpcError with code');
    });
});
