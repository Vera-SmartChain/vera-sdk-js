import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, '..');
// Known production public keys or fingerprints that must NOT have private keys exposed
const KNOWN_PRODUCTION_PUBKEYS = [
    '8d2b423c2b284f1a1ed40730c4e7b6d317042965eb77e24d245bafe279f50a75',
    'b0e860166167e5e8b09d4d310f3f8a2b7f04518498ca7c177e259dabbf1f8a21',
    '1d55d5216ca8c2be14e9f71441791fbd6211b7fef3dfb24377b3460758dd538d',
];
function getAllFiles(dir, fileList = []) {
    const files = fs.readdirSync(dir);
    for (const file of files) {
        if (file === 'node_modules' || file === '.git' || file === 'dist-test')
            continue;
        const fullPath = path.join(dir, file);
        const stat = fs.statSync(fullPath);
        if (stat.isDirectory()) {
            getAllFiles(fullPath, fileList);
        }
        else {
            fileList.push(fullPath);
        }
    }
    return fileList;
}
test('T9 — Secret Scan across repository and artifacts', async (t) => {
    await t.test('Repository contains zero private keys, secrets, or .env files', () => {
        const allFiles = getAllFiles(repoRoot);
        const leaks = [];
        // Check for dangerous filenames
        for (const file of allFiles) {
            const base = path.basename(file).toLowerCase();
            if (base === '.env' ||
                base.endsWith('.key') ||
                base.endsWith('.pem') ||
                base.includes('secret') ||
                base.includes('validator_key') ||
                base.includes('faucet_key')) {
                leaks.push(`Forbidden file found: ${file}`);
            }
        }
        // Check file contents for private key patterns
        const privateKeyPatterns = [
            /BEGIN (RSA|EC|OPENSSH|DSA|PRIVATE) KEY/,
            /PRIVATE_KEY\s*=\s*['"][0-9a-fA-F]{64}['"]/,
            /validator_key\.hex/,
            /faucet_key\.hex/,
        ];
        for (const file of allFiles) {
            // Skip binary files and JSON artifacts
            if (file.endsWith('.tgz') || file.endsWith('.png') || file.endsWith('.jpg'))
                continue;
            const content = fs.readFileSync(file, 'utf8');
            for (const pattern of privateKeyPatterns) {
                if (pattern.test(content)) {
                    leaks.push(`Suspicious secret pattern in ${file}: matches ${pattern}`);
                }
            }
        }
        assert.equal(leaks.length, 0, `Secret leak detected in repository:\n${leaks.join('\n')}`);
    });
});
