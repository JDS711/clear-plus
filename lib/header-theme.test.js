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
test('header tile and smoke preserve square proportions instead of flex squeezing', () => {
  assert.match(css, /app-header \.app-brand-tile\{flex:0 0 36px;[^}]*height:36px;aspect-ratio:1/);
  assert.match(css, /app-brand-tile svg\{flex:none;width:20px;height:20px;aspect-ratio:1/);
  assert.match(app, /app-header-brand flex items-center gap-4 shrink-0/);
});
test('laptop header defers full navigation and long subtitle until enough room exists', () => {
  assert.match(app, /app-header-navigation hidden xl:flex/);
  assert.match(app, /hidden 2xl:block tracking-wide whitespace-nowrap/);
  assert.match(app, /className="xl:hidden w-9 h-9/);
});
