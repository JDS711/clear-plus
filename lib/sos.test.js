import test from 'node:test';
import assert from 'node:assert/strict';
import {
  FREE_GUIDED_SESSIONS,
  canStartGuidedBreathing,
  nextGuidedUseCount,
} from './sos.js';

test('free members can start exactly three guided sessions per day', () => {
  assert.equal(FREE_GUIDED_SESSIONS, 3);
  assert.equal(canStartGuidedBreathing(false, 0), true);
  assert.equal(canStartGuidedBreathing(false, 2), true);
  assert.equal(canStartGuidedBreathing(false, 3), false);
});

test('premium members can start guided breathing after the free allowance', () => {
  assert.equal(canStartGuidedBreathing(true, 3), true);
  assert.equal(canStartGuidedBreathing(true, 99), true);
});

test('only free guided starts increment and the counter cannot exceed its limit', () => {
  assert.equal(nextGuidedUseCount(false, 0), 1);
  assert.equal(nextGuidedUseCount(false, 2), 3);
  assert.equal(nextGuidedUseCount(false, 3), 3);
  assert.equal(nextGuidedUseCount(true, 3), 3);
});
