// lib/client-entitlement.test.js
//
// Guards the CLIENT half of the fix: App.tsx must not grant Premium from a local flag.
//
// The server side is covered behaviourally in verify.test.js. This is a structural check, which is
// weaker than rendering the component — but this project has no component-test toolchain and does
// not need one for the single regression that matters here: someone reintroducing
// `clear_isPremium` as a source of truth.
//
// Run: npm test

import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const raw = readFileSync(new URL('../src/App.tsx', import.meta.url), 'utf8');

/**
 * Source with comments removed.
 * Without this, a comment that merely NAMES the flag satisfies a regex looking for its use.
 */
function code(src) {
  return src.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/(^|\s)\/\/[^\n]*/g, '$1');
}

const app = code(raw);

describe('App.tsx must not trust a local premium flag', () => {
  test('it never READS clear_isPremium', () => {
    // Reading this key was the hole: anyone could set it by hand and keep Premium forever.
    assert.doesNotMatch(
      app,
      /getItem\(\s*['"]clear_isPremium['"]/,
      'clear_isPremium must never be read — entitlement is server-derived'
    );
  });

  test('it never WRITES clear_isPremium', () => {
    // Writing it is what made the key worth forging in the first place.
    assert.doesNotMatch(
      app,
      /setItem\(\s*['"]clear_isPremium['"]/,
      'clear_isPremium must not be written — do not mirror entitlement into the browser'
    );
  });

  test('premium state initialises to false, not from storage', () => {
    assert.match(
      app,
      /const \[isPremium, setIsPremium\] = useState\(false\)/,
      'isPremium must start false and stay false until the server says otherwise'
    );
  });

  test('the stored credential is the SESSION ID, and it is re-verified', () => {
    assert.match(app, /clear_premium_session/, 'the session id is the credential that is stored');
    assert.match(app, /api\/verify-checkout/, 'and it must be re-verified against the server');
  });

  test('the comment stripper is doing its job', () => {
    // Guards the guard: if stripping silently stops working, the assertions above become
    // name-matching against comments and would pass for the wrong reason.
    assert.doesNotMatch(code("// getItem('clear_isPremium')\n"), /clear_isPremium/);
    assert.match(code("getItem('clear_isPremium')"), /clear_isPremium/);
  });
});
