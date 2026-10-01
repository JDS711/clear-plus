import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const app = fs.readFileSync('src/App.tsx', 'utf8');
const css = fs.readFileSync('src/remodel.css', 'utf8');

test('the page root does not create a competing vertical scroll container', () => {
  assert.doesNotMatch(app, /overflow-x-hidden/);
  assert.doesNotMatch(css, /touch-action\s*:\s*pan-y/);
  assert.doesNotMatch(css, /overscroll-behavior-y\s*:\s*contain/);
  assert.match(css, /\.clear-shell\{overflow-x:clip\}/);
});
