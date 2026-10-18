import { createVeraClient } from '../dist/esm/index.js';

const client = createVeraClient();
const proof = await client.getProof('0x19bca81ccf1752528f1ee5d15fde1eebe9012c8fc8f76654d51b4304b61ebf2e');
console.log('Proof shape:', Object.keys(proof), 'proof.proof:', Array.isArray(proof.proof), proof);

const blocks = await client.getRecentBlocks(2);
console.log('Recent blocks shape:', blocks[0]);

const txs = await client.getRecentTransactions(2);
console.log('Recent txs shape:', txs[0]);
