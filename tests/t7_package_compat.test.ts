import test from 'node:test';
import assert from 'node:assert/strict';
import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import * as esbuild from 'esbuild';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = fs.existsSync(path.join(__dirname, '..', 'README.md'))
  ? path.resolve(__dirname, '..')
  : path.resolve(__dirname, '..', '..');

test('T7 — Package Audit, ESM/CJS Compatibility & Browser Bundle', async (t) => {
  await t.test('npm pack tarball contents audit', () => {
    const stdout = execSync('npm pack --dry-run --json', {
      cwd: repoRoot,
      encoding: 'utf8',
    });

    const parsed = JSON.parse(stdout);
    const files: Array<{ path: string }> = parsed[0]?.files || [];
    assert.ok(files.length > 0, 'Tarball must contain files');

    const filePaths = files.map((f) => f.path);

    // Must contain dist and metadata
    assert.ok(filePaths.includes('dist/esm/index.js'), 'Must include dist/esm/index.js');
    assert.ok(filePaths.includes('dist/cjs/index.js'), 'Must include dist/cjs/index.js');
    assert.ok(filePaths.includes('dist/types/index.d.ts'), 'Must include dist/types/index.d.ts');
    assert.ok(filePaths.includes('README.md'), 'Must include README.md');
    assert.ok(filePaths.includes('LICENSE'), 'Must include LICENSE');

    // Forbidden in tarball
    for (const p of filePaths) {
      assert.ok(!p.startsWith('src/'), `Source files must not be in tarball: ${p}`);
      assert.ok(!p.startsWith('tests/'), `Test files must not be in tarball: ${p}`);
      assert.ok(!p.includes('.env'), `Environment files must not be in tarball: ${p}`);
      assert.ok(!p.includes('node_modules'), `node_modules must not be in tarball: ${p}`);
      assert.ok(!p.endsWith('.key') && !p.endsWith('.hex'), `Key files must not be in tarball: ${p}`);
    }
  });

  await t.test('Browser bundling with esbuild succeeds with zero errors', async () => {
    const outfile = path.join(repoRoot, 'dist', 'bundle-test.js');
    const result = await esbuild.build({
      entryPoints: [path.join(repoRoot, 'dist', 'esm', 'index.js')],
      bundle: true,
      platform: 'browser',
      format: 'esm',
      outfile,
      minify: true,
    });

    assert.equal(result.errors.length, 0, 'esbuild browser bundling must have 0 errors');
    assert.ok(fs.existsSync(outfile), 'Browser bundle file must be generated');
    const stat = fs.statSync(outfile);
    assert.ok(stat.size > 1000 && stat.size < 50000, `Bundle size should be compact (~10KB), was ${stat.size}B`);
    fs.unlinkSync(outfile);
  });

  await t.test('npm audit reports 0 high/critical vulnerabilities', () => {
    const stdout = execSync('npm audit --json', {
      cwd: repoRoot,
      encoding: 'utf8',
    });

    const report = JSON.parse(stdout);
    const vulns = report.metadata?.vulnerabilities || {};
    assert.equal(vulns.high || 0, 0, 'Must have 0 high vulnerabilities');
    assert.equal(vulns.critical || 0, 0, 'Must have 0 critical vulnerabilities');
  });

  await t.test('Dual ESM and CJS imports in current Node (v22)', () => {
    const esmIndexUrl = pathToFileURL(path.join(repoRoot, 'dist', 'esm', 'index.js')).href;
    const esmViemUrl = pathToFileURL(path.join(repoRoot, 'dist', 'esm', 'viem.js')).href;
    const esmEthersUrl = pathToFileURL(path.join(repoRoot, 'dist', 'esm', 'ethers.js')).href;

    const cjsIndexPath = path.join(repoRoot, 'dist', 'cjs', 'index.js').replace(/\\/g, '/');
    const cjsViemPath = path.join(repoRoot, 'dist', 'cjs', 'viem.js').replace(/\\/g, '/');
    const cjsEthersPath = path.join(repoRoot, 'dist', 'cjs', 'ethers.js').replace(/\\/g, '/');

    // Test ESM import
    const esmCode = `
      import { createVeraClient, parseVera, formatVera, toEvmAddress, isVeraAddress, veraTestnet } from '${esmIndexUrl}';
      import { veraTestnet as viemChain } from '${esmViemUrl}';
      import { veraTestnetNetwork } from '${esmEthersUrl}';

      if (!veraTestnet || !viemChain || !veraTestnetNetwork) process.exit(1);
      if (parseVera('1.5') !== 1500000000000000000n) process.exit(2);
      if (formatVera(1500000000000000000n) !== '1.5') process.exit(3);
      console.log('ESM Import OK');
    `;
    execSync(`node --input-type=module -e "${esmCode.replace(/\n/g, ' ')}"`, { cwd: repoRoot });

    // Test CJS require
    const cjsCode = `
      const { createVeraClient, parseVera, formatVera, toEvmAddress, isVeraAddress, veraTestnet } = require('${cjsIndexPath}');
      const { veraTestnet: viemChain } = require('${cjsViemPath}');
      const { veraTestnetNetwork } = require('${cjsEthersPath}');

      if (!veraTestnet || !viemChain || !veraTestnetNetwork) process.exit(1);
      if (parseVera('1.5') !== 1500000000000000000n) process.exit(2);
      if (formatVera(1500000000000000000n) !== '1.5') process.exit(3);
      console.log('CJS Require OK');
    `;
    execSync(`node -e "${cjsCode.replace(/\n/g, ' ')}"`, { cwd: repoRoot });
  });

  await t.test('Dual ESM and CJS imports across Node 18 and Node 20', () => {
    const nodeBinsDir = 'C:/Users/Carlos/.gemini/antigravity-ide/brain/b49f9319-ee9a-48b5-8d70-5f77ba1ba75c/scratch/node_bins';
    const versions = [
      { name: 'Node 18', bin: path.join(nodeBinsDir, 'node18.exe') },
      { name: 'Node 20', bin: path.join(nodeBinsDir, 'node20.exe') },
    ];

    const esmIndexUrl = pathToFileURL(path.join(repoRoot, 'dist', 'esm', 'index.js')).href;
    const cjsIndexPath = path.join(repoRoot, 'dist', 'cjs', 'index.js').replace(/\\/g, '/');

    for (const { name, bin } of versions) {
      if (!fs.existsSync(bin)) {
        console.log(`[T7 Notice] ${name} binary not found at ${bin}, skipping`);
        continue;
      }

      // Check version string
      const versionStr = execSync(`"${bin}" -v`, { encoding: 'utf8' }).trim();
      console.log(`[T7] Testing with ${name} (${versionStr})...`);

      // Test ESM
      const esmCode = `
        import { createVeraClient, parseVera, formatVera, toEvmAddress, isVeraAddress, veraTestnet } from '${esmIndexUrl}';
        if (parseVera('2.0') !== 2000000000000000000n) process.exit(1);
        console.log('${name} ESM OK');
      `;
      execSync(`"${bin}" --input-type=module -e "${esmCode.replace(/\n/g, ' ')}"`, { cwd: repoRoot });

      // Test CJS
      const cjsCode = `
        const { createVeraClient, parseVera, formatVera, toEvmAddress, isVeraAddress, veraTestnet } = require('${cjsIndexPath}');
        if (formatVera(2000000000000000000n) !== '2') process.exit(1);
        console.log('${name} CJS OK');
      `;
      execSync(`"${bin}" -e "${cjsCode.replace(/\n/g, ' ')}"`, { cwd: repoRoot });
    }
  });
});

