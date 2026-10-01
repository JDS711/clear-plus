import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const app = fs.readFileSync(new URL('../src/App.tsx', import.meta.url), 'utf8');
const css = fs.readFileSync(new URL('../src/remodel.css', import.meta.url), 'utf8');

test('header branding and premium controls use the selected accent', () => {
  assert.match(app, /app-header/);
  assert.match(app, /app-accent-fill/);
  assert.match(app, /app-accent-soft/);
  assert.match(css, /\.app-accent-fill\{background:var\(--theme-accent\)/);
  assert.match(css, /\.app-header\{background:color-mix\(in srgb,var\(--theme-surface\).*var\(--theme-accent\)/);
});