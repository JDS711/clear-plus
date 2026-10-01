import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const app = fs.readFileSync(new URL('../src/App.tsx', import.meta.url), 'utf8');
const css = fs.readFileSync(new URL('../src/remodel.css', import.meta.url), 'utf8');

test('analytics and pledge jar use the selected accent instead of fixed green', () => {
  assert.doesNotMatch(app, /stopColor="#10b981"/);
  assert.match(app, /stopColor="var\(--theme-accent\)"/);
  assert.match(app, /rewards-accent-wash/);
  assert.match(app, /pledge-fill/);
  assert.match(css, /\.pledge-fill\{background:linear-gradient\(to top,var\(--theme-accent\),var\(--theme-highlight\)\)/);
});

test('the app header carries an unmistakable selected-accent tint', () => {
  assert.match(css, /\.app-header\{background:color-mix\(in srgb,var\(--theme-surface\) 82%,var\(--theme-accent\) 18%\)/);
});