import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
const read = path => readFileSync(new URL(path, import.meta.url), 'utf8');
const app = read('../src/App.tsx');
const css = read('../src/remodel.css');
test('four accent tiles have accessible names but no visible colour text', () => {
  const tiles = app.slice(app.indexOf('<div className="accent-tiles"'), app.indexOf('<div className="accent-tiles"') + 550);
  assert.match(tiles, /aria-label=\{option.label\}/); assert.match(tiles, /aria-pressed/);
  assert.doesNotMatch(tiles, /\{option.label\}\s*</); assert.match(css, /\.accent-tiles\{display:grid;grid-template-columns:repeat\(4/);
});
test('bundled comic font is actually applied on the dashboard and controls', () => {
  assert.match(app, /Clear Comic/); assert.match(app, /Comic Neue/);
  assert.match(css, /\.clear-shell,\.clear-shell \.remodel\{font-family:var\(--app-font/);
  assert.match(read('../src/comic-font.css'), /font-weight:700/);
});
test('piggy icon follows accent and all brand icons share smoke artwork', () => {
  assert.match(app, /PiggyBank className="piggy-accent/);
  assert.match(css, /\.clear-shell \.piggy-accent\{color:var\(--theme-accent\)\}/);
  assert.match(app, /img src="\/favicon.svg\?v=2"/);
  assert.match(read('../public/favicon.svg'), /M12.8 19.6/);
  assert.match(read('../index.html'), /apple-touch-icon-v2.png/);
  assert.equal(JSON.parse(read('../public/manifest.webmanifest')).icons.length, 2);
});
