import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, '..');
import os from 'node:os';
const scratchDir = process.env.VERA_SCRATCH_DIR || os.tmpdir();
test('T6 — Automated Extraction and Live Execution of all Doc and README code snippets', async (t) => {
    const tempSnippetDir = path.join(scratchDir, 't6_snippets');
    fs.mkdirSync(tempSnippetDir, { recursive: true });
    // 1. Extract and execute from README.md
    await t.test('All TypeScript / JavaScript snippets in README.md execute successfully', () => {
        const readmePath = path.join(repoRoot, 'README.md');
        const content = fs.readFileSync(readmePath, 'utf8');
        // Regex to match code blocks: ```typescript ... ``` or ```javascript ... ```
        const codeBlockRegex = /```(typescript|javascript)\n([\s\S]*?)```/g;
        let match;
        let count = 0;
        while ((match = codeBlockRegex.exec(content)) !== null) {
            count++;
            const code = match[2].trim();
            const snippetFile = path.join(tempSnippetDir, `readme_snippet_${count}.mjs`);
            // Write snippet directly (package self-reference allows import from '@verachain/sdk')
            fs.writeFileSync(snippetFile, code);
            try {
                const stdout = execSync(`node "${snippetFile}"`, {
                    cwd: repoRoot,
                    encoding: 'utf8',
                    timeout: 15000,
                });
                assert.ok(stdout.length >= 0);
            }
            catch (err) {
                assert.fail(`README snippet #${count} failed to execute:\n--- CODE ---\n${code}\n--- ERROR ---\n${err.message}`);
            }
            finally {
                if (fs.existsSync(snippetFile))
                    fs.unlinkSync(snippetFile);
            }
        }
        assert.ok(count >= 5, `Expected at least 5 executable snippets in README, found ${count}`);
        console.log(`[T6] Successfully executed all ${count} code snippets extracted from README.md`);
    });
    // 2. Extract and execute from docs draft (index.html.sdk-draft)
    await t.test('All TypeScript / JavaScript snippets in docs draft execute successfully', () => {
        const draftPath = path.join(scratchDir, 'index.html.sdk-draft');
        assert.ok(fs.existsSync(draftPath), 'Draft index.html.sdk-draft must exist');
        const content = fs.readFileSync(draftPath, 'utf8');
        // Extract the sdk-js section
        const sdkJsMatch = content.match(/'sdk-js':\s*\{[\s\S]*?html:\s*`([\s\S]*?)`\s*\},/);
        assert.ok(sdkJsMatch, 'Could not find sdk-js section in docs draft');
        const htmlContent = sdkJsMatch[1];
        // Find all <div class="code-panel"> ... <span>typescript</span> ... <pre class="code-body">CODE</pre>
        const panelRegex = /<div class="code-panel">[\s\S]*?<span>(typescript|javascript)<\/span>[\s\S]*?<pre class="code-body">([\s\S]*?)<\/pre>/g;
        let match;
        let count = 0;
        while ((match = panelRegex.exec(htmlContent)) !== null) {
            count++;
            let code = match[2].trim();
            // Unescape any escaped HTML entities or escaped template literal backslashes (\${ -> ${)
            code = code.replace(/\\(\$\{)/g, '$1');
            code = code.replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&');
            const snippetFile = path.join(tempSnippetDir, `doc_snippet_${count}.mjs`);
            fs.writeFileSync(snippetFile, code);
            try {
                const stdout = execSync(`node "${snippetFile}"`, {
                    cwd: repoRoot,
                    encoding: 'utf8',
                    timeout: 15000,
                });
                assert.ok(stdout.length >= 0);
            }
            catch (err) {
                assert.fail(`Docs draft snippet #${count} failed to execute:\n--- CODE ---\n${code}\n--- ERROR ---\n${err.message}`);
            }
            finally {
                if (fs.existsSync(snippetFile))
                    fs.unlinkSync(snippetFile);
            }
        }
        assert.ok(count >= 5, `Expected at least 5 executable snippets in docs draft, found ${count}`);
        console.log(`[T6] Successfully executed all ${count} code snippets extracted from docs draft`);
    });
});
