import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
test('customer-facing branding is Clear+ without a version suffix', () => {
  for (const path of ['../index.html', '../src/App.tsx', '../src/Remodel.tsx', '../public/manifest.webmanifest']) {
    const source = readFileSync(new URL(path, import.meta.url), 'utf8');
    assert.doesNotMatch(source, /clear-plus1\.0|Clear\+\s*1\.0/i);
    assert.match(source, /Clear\+/);
  }
});
