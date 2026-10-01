import test from 'node:test';
import assert from 'node:assert/strict';
import {
  FIVE_MINUTE_PAUSE_SECONDS,
  fiveMinutePauseRemaining,
  buildSavingsProjection,
} from './progress.js';

test('five-minute pause never displays 5:01', () => {
  assert.equal(fiveMinutePauseRemaining(300_900, 0), FIVE_MINUTE_PAUSE_SECONDS);
  assert.equal(fiveMinutePauseRemaining(300_000, 0), 300);
  assert.equal(fiveMinutePauseRemaining(299_999, 0), 299);
  assert.equal(fiveMinutePauseRemaining(1_000, 2_000), 0);
});

test('savings series includes history, today and genuine future projections', () => {
  const points = buildSavingsProjection(20, 12, 10);
  const today = points.find(point => point.kind === 'today');
  const final = points.at(-1);

  assert.equal(points[0].day, 6);
  assert.deepEqual(today, { day: 20, saved: 205, kind: 'today' });
  assert.deepEqual(final, { day: 35, saved: 350, kind: 'projection' });
  assert.ok(points.some(point => point.kind === 'history'));
});