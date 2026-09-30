import { test } from 'node:test';
import assert from 'node:assert/strict';
import { countDailyLogs, canSaveCraving } from './cravings.js';

test('free users can save all three logs, and the fourth is blocked', () => {
  const now = new Date(2026, 8, 30, 12);
  const logs = [];
  for (let i = 0; i < 3; i++) {
    assert.equal(canSaveCraving(logs, false, now), true);
    logs.push({ time: now, passed: i === 0 });
  }
  assert.equal(countDailyLogs(logs, now), 3);
  assert.equal(canSaveCraving(logs, false, now), false);
  assert.equal(canSaveCraving(logs, true, now), true);
});

test('allowance resets at local midnight and restored ISO dates count', () => {
  const yesterday = new Date(2026, 8, 30, 23, 59);
  const today = new Date(2026, 9, 1, 0, 1);
  const logs = Array.from({ length: 3 }, () => ({ time: yesterday.toISOString() }));
  assert.equal(countDailyLogs(logs, yesterday), 3);
  assert.equal(countDailyLogs(logs, today), 0);
  assert.equal(canSaveCraving(logs, false, today), true);
});
