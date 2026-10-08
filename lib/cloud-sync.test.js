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

test('a deliberate settings edit wins even when cloud has premium or more history', () => {
  const local = { ...base, quitDate: '2026-09-20T00:00:00Z', appTheme: 'blue', displayMode: 'night', textSize: 'large', cigsPerDay: 30 };
  const remote = {
    ...base,
    quitDate: '2026-09-20T00:00:00Z',
    appTheme: 'green',
    displayMode: 'light',
    textSize: 'standard',
    cigsPerDay: 20,
    premiumSession: 'cs_remote',
    journals: [{ id: 'j1', date: '2026-10-01T02:00:00Z' }],
  };
  const merged = reconcileCloudStates(local, remote, { preferLocalSettings: true });
  assert.equal(merged.appTheme, 'blue');
  assert.equal(merged.displayMode, 'night');
  assert.equal(merged.textSize, 'large');
  assert.equal(merged.cigsPerDay, 30);
  assert.equal(merged.premiumSession, 'cs_remote');
  assert.equal(merged.journals.length, 1);
});

test('a deliberately edited quit date does not snap back to the older cloud date', () => {
  const local = { ...base, quitDate: '2026-09-30T02:00:00Z' };
  const remote = { ...base, quitDate: '2026-09-20T02:00:00Z', premiumSession: 'cs_remote' };
  const merged = reconcileCloudStates(local, remote, { preferLocalSettings: true });
  assert.equal(merged.quitDate, '2026-09-30T02:00:00.000Z');
  assert.equal(merged.premiumSession, 'cs_remote');
});

test('newer phone settings win even when the PC has more history', () => {
  const phone = { ...base, settingsUpdatedAt: 200, quitDate: '2026-10-05T00:00:00Z', appTheme: 'rose', appFont: 'comic', currency: 'USD', region: 'US' };
  const pc = { ...base, settingsUpdatedAt: 100, quitDate: '2026-09-20T00:00:00Z', appTheme: 'green', journals: [{ id: 'old', date: '2026-10-01T00:00:00Z' }] };
  const merged = reconcileCloudStates(pc, phone);
  assert.equal(merged.appTheme, 'rose'); assert.equal(merged.appFont, 'comic'); assert.equal(merged.currency, 'USD');
  assert.equal(merged.quitDate, new Date(phone.quitDate).toISOString()); assert.equal(merged.journals.length, 1);
  assert.equal(merged.settingsUpdatedAt, 200);
});

test('a deliberately cleared quit date propagates instead of restoring the earlier date', () => {
  const phone = { ...base, settingsUpdatedAt: 200, quitDate: null };
  const pc = { ...base, settingsUpdatedAt: 100, quitDate: '2026-09-20T00:00:00Z' };
  assert.equal(reconcileCloudStates(pc, phone).quitDate, null);
});


test('quit-date edits are independent of newer unrelated PC settings', () => {
  const phone = { ...base, settingsUpdatedAt: 100, quitDate: '2026-10-06T10:00:00Z', quitDateRevision: 2, quitDateEditId: 'phone-edit' };
  const stalePC = { ...base, settingsUpdatedAt: 300, appFont: 'comic', quitDate: '2026-10-01T10:00:00Z', quitDateRevision: 1, quitDateEditId: 'older-edit' };
  const result = reconcileCloudStates(stalePC, phone);
  assert.equal(result.quitDate, '2026-10-06T10:00:00.000Z');
  assert.equal(result.quitDateRevision, 2); assert.equal(result.appFont, 'comic');
  assert.equal(reconcileCloudStates(phone, result).quitDate, result.quitDate);
});
test('a PC clear-date edit survives syncing back to mobile', () => {
  const pc = { ...base, quitDate: null, quitDateRevision: 4, quitDateEditId: 'pc-clear' };
  const phone = { ...base, settingsUpdatedAt: 500, quitDate: '2026-10-01T10:00:00Z', quitDateRevision: 3, quitDateEditId: 'phone-old' };
  assert.equal(reconcileCloudStates(phone, pc).quitDate, null);
});
test('concurrent date edits converge deterministically without dependence on wall-clock time', () => {
  const a = { ...base, quitDate: '2026-10-01T10:00:00Z', quitDateRevision: 4, quitDateEditId: 'a' };
  const b = { ...base, quitDate: '2026-10-06T10:00:00Z', quitDateRevision: 4, quitDateEditId: 'b' };
  assert.equal(reconcileCloudStates(a, b).quitDate, reconcileCloudStates(b, a).quitDate);
});
