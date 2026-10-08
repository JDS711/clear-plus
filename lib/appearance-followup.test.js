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
  assert.match(app, /aria-label="Clear\+ dashboard"[^\n]*className="app-brand-tile[^\n]*<Wind/);
  assert.match(read('../public/favicon.svg'), /M12.6 19.4/);
  assert.match(read('../index.html'), /apple-touch-icon-v6.png/);
  assert.equal(JSON.parse(read('../public/manifest.webmanifest')).icons.length, 2);
});


test('brand smoke paths match the original installed Wind icon exactly', () => {
  const source = read('../node_modules/lucide-react/dist/esm/icons/wind.js');
  const paths = [...source.matchAll(/d: "([^"]+)"/g)].map(match => match[1]);
  const brand = read('../public/favicon.svg');
  assert.equal(paths.length, 3);
  for (const path of paths) assert.ok(brand.includes(`d="${path}"`));
  assert.match(brand, /scale\(1\.4814815\)/);
});


test('locked premium analytics, lock badge and central crown share accent styling', () => {
  const elements = [...app.matchAll(/data-premium-accent="(analytics|locked|crown)" className="([^"]+)"/g)];
  assert.equal(elements.length, 3);
  for (const element of elements) assert.ok(element[2].includes('app-accent-soft'));
  assert.doesNotMatch(app, /bg-violet-500\/15/);
});

test('numeric steppers use selected accent rather than native spinner colours', () => {
  const component = read('../src/EditableNumberInput.tsx');
  assert.match(component, /aria-label=\{`Increase \$\{label\}`\}/);
  assert.match(component, /aria-label=\{`Decrease \$\{label\}`\}/);
  assert.match(component, /event\.key === 'ArrowUp'/);
  assert.match(css, /\.clear-shell \.number-step\{[^}]*color:var\(--theme-accent\)/);
  assert.match(css, /width:44px;min-height:44px/);
});


test('quit-date editor focus uses the selected accent instead of orange', () => {
  assert.doesNotMatch(css, /outline:3px solid #b27821/);
  assert.match(css, /input\[type="datetime-local"\]:focus\{[^}]*outline:3px solid var\(--theme-accent\)/);
});


test('restore purchase button only appears in the signed-in account section', () => {
  const start = app.indexOf('{user ? (');
  const button = app.indexOf('onClick={restorePremium}');
  const signedOut = app.indexOf(') : (', start);
  assert.ok(start >= 0 && button > start && button < signedOut);
});


test('brand tile stays bright blue, independent of selected accent', () => {
  assert.match(css, /\.clear-shell \.app-brand-tile\{background:#2563eb;color:#fff\}/);
  assert.match(read('../public/favicon.svg'), /fill="#2563eb"/);
});
