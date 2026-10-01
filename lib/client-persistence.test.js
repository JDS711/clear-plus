import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const source = fs.readFileSync(new URL('../src/App.tsx', import.meta.url), 'utf8');

test('journal and craving records are written to local storage', () => {
  assert.match(source, /setItem\('clear_journals', JSON\.stringify\(journals\)\)/);
  assert.match(source, /setItem\('clear_cravings', JSON\.stringify\(cravings\)\)/);
  assert.match(source, /setItem\('clear_journals', JSON\.stringify\(next\)\)/);
  assert.match(source, /setItem\('clear_cravings', JSON\.stringify\(next\)\)/);
});

test('the current section survives refresh through the URL hash', () => {
  assert.match(source, /tabFromHash/);
  assert.match(source, /#\$\{hashForTab\(tab\)\}/);
  assert.match(source, /addEventListener\('hashchange'/);
});

test('appearance choices are persisted independently', () => {
  assert.match(source, /clear_theme/);
  assert.match(source, /clear_displayMode/);
  assert.match(source, /clear_textSize/);
  assert.match(source, /clear_font/);
});