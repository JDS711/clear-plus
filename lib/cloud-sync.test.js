import test from 'node:test';
import assert from 'node:assert/strict';
import { progressScore, reconcileCloudStates } from './cloud-sync.js';

const base = { cigsPerDay: 20, costPerPack: 50, packSize: 25, cravings: [], journals: [] };

test('a phone with real progress beats a blank computer cloud row', () => {
  const phone = { ...base, quitDate: '2026-09-20T00:00:00.000Z', cigsPerDay: 30, premiumSession: 'cs_phone' };
  const computer = { ...base, quitDate: null };
  const merged = reconcileCloudStates(phone, computer);
  assert.equal(merged.quitDate, phone.quitDate);
  assert.equal(merged.cigsPerDay, 30);
  assert.equal(merged.premiumSession, 'cs_phone');
});

test('journal and craving history from both devices is preserved without duplicates', () => {
  const phone = { ...base, cravings: [{ id: 'c1', time: '2026-10-01T01:00:00Z', passed: false }], journals: [{ id: 'j1', date: '2026-10-01T01:00:00Z', text: 'phone' }] };
  const computer = { ...base, cravings: [{ id: 'c1', time: '2026-10-01T01:00:00Z', passed: true }, { id: 'c2', time: '2026-10-01T02:00:00Z', passed: false }], journals: [{ id: 'j2', date: '2026-10-01T02:00:00Z', text: 'computer' }] };
  const merged = reconcileCloudStates(phone, computer);
  assert.deepEqual(merged.cravings.map(item => item.id), ['c2', 'c1']);
  assert.equal(merged.cravings.find(item => item.id === 'c1').passed, true);
  assert.deepEqual(merged.journals.map(item => item.id), ['j2', 'j1']);
});

test('reconciliation is deterministic after either device receives the merged row', () => {
  const phone = { ...base, quitDate: '2026-09-20T00:00:00Z', journals: [{ id: 'j1', date: '2026-10-01T01:00:00Z' }] };
  const computer = { ...base, journals: [{ id: 'j2', date: '2026-10-01T02:00:00Z' }] };
  const merged = reconcileCloudStates(phone, computer);
  assert.deepEqual(reconcileCloudStates(phone, merged), merged);
  assert.ok(progressScore(merged) >= progressScore(phone));
});

test('a deliberate local settings edit wins when both copies have equal progress', () => {
  const local = { ...base, quitDate: '2026-09-20T00:00:00Z', appTheme: 'blue', displayMode: 'night', textSize: 'large', cigsPerDay: 30 };
  const remote = { ...base, quitDate: '2026-09-20T00:00:00Z', appTheme: 'green', displayMode: 'light', textSize: 'standard', cigsPerDay: 20 };
  const merged = reconcileCloudStates(local, remote, { preferLocalOnTie: true });
  assert.equal(merged.appTheme, 'blue');
  assert.equal(merged.displayMode, 'night');
  assert.equal(merged.textSize, 'large');
  assert.equal(merged.cigsPerDay, 30);
});
