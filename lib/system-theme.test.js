import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const app = fs.readFileSync(new URL('../src/App.tsx', import.meta.url), 'utf8');
const html = fs.readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const css = fs.readFileSync(new URL('../src/remodel.css', import.meta.url), 'utf8');

test('phone browser chrome follows the selected app theme', () => {
  assert.match(html, /name="theme-color"/);
  assert.match(app, /SYSTEM_THEME_COLORS\[appTheme\]\[displayMode\]/);
  assert.match(app, /SYSTEM_CANVAS_COLORS\[appTheme\]/);
  assert.match(app, /meta\[name="theme-color"\]/);
  assert.match(app, /document\.body\.style\.setProperty\('background-color', canvas, 'important'\)/);
});

test('both breathing experiences use theme variables instead of fixed green', () => {
  assert.equal((app.match(/className=\{`breath-orb /g) || []).length, 2);
  assert.equal((app.match(/I beat the craving/g) || []).length, 2);
  assert.match(css, /\.breath-orb\{background:linear-gradient\(135deg,var\(--theme-highlight\),var\(--theme-accent\)\)/);
  assert.match(css, /\.sos-accent-wash\{/);
});