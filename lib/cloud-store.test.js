import test from 'node:test';
import assert from 'node:assert/strict';
import { saveCloudState, syncErrorLabel } from './cloud-store.js';
import { reconcileCloudStates } from './cloud-sync.js';
const base = { version: 4, settingsUpdatedAt: 100, region: 'AU', currency: 'AUD', quitDate: null, cigsPerDay: 20, costPerPack: 50, packSize: 25, cravings: [], journals: [] };
const clone = value => JSON.parse(JSON.stringify(value));
function database(initial, conflict = false) {
  let row = initial ? { user_id: 'owner', state: clone(initial), updated_at: '2026-10-08T08:00:00Z' } : null;
  let writes = 0;
  const client = { from(table) {
    assert.equal(table, 'user_state');
    const filters = {}; let operation = 'read'; let value;
    const query = {
      select() { return this; }, eq(key, val) { filters[key] = val; return this; }, is(key, val) { filters[key] = val; return this; },
      update(v) { operation = 'update'; value = v; return this; },
      async insert(v) { if (row) return { error: { code: '23505' } }; row = clone(v); writes++; return { error: null }; },
      async maybeSingle() {
        assert.equal(filters.user_id, 'owner');
        if (operation === 'read') return { data: clone(row), error: null };
        if (conflict) {
          conflict = false;
          row.state.journals.push({ id: 'concurrent', date: '2026-10-08T08:01:00Z', text: 'PC' });
          row.updated_at = '2026-10-08T08:01:00Z';
        }
        if (filters.updated_at !== row.updated_at) return { data: null, error: null };
        row = { ...row, ...clone(value) }; writes++; return { data: { state: clone(row.state) }, error: null };
      },
    }; return query;
  } };
  return { client, read: () => row, writes: () => writes };
}
test('concurrent writers re-read and preserve both devices history', async () => {
  const db = database(base, true);
  const result = await saveCloudState(db.client, 'owner', { ...base, settingsUpdatedAt: 200, appTheme: 'blue', journals: [{ id: 'phone', date: '2026-10-08T08:02:00Z' }] });
  assert.equal(result.error, undefined);
  assert.deepEqual(result.state.journals.map(j => j.id).sort(), ['concurrent', 'phone']);
  assert.equal(result.state.appTheme, 'blue'); assert.equal(db.writes(), 1);
});
test('new per-user rows are inserted without anonymous access', async () => {
  const db = database(null);
  const result = await saveCloudState(db.client, 'owner', base);
  assert.ok(result.state); assert.equal(db.read().user_id, 'owner');
});
test('cancelled sync does not write after account switch', async () => {
  const db = database(base);
  assert.equal((await saveCloudState(db.client, 'owner', base, { cancelled: () => true })).cancelled, true);
  assert.equal(db.writes(), 0);
});
test('permission and schema problems are distinguished from network errors', () => {
  assert.match(syncErrorLabel({ code: '42501' }), /permission/);
  assert.match(syncErrorLabel({ code: 'PGRST205' }), /not configured/);
  assert.match(syncErrorLabel(null), /remains on this device/);
});

test('unchanged JSONB state does not write just because object keys were reordered', async () => {
  const state = reconcileCloudStates({ ...base, journals: [{ id: 'journal', date: '2026-10-08T08:00:00.000Z', mood: 'great', text: 'Saved entry' }], cravings: [{ id: 'craving', time: '2026-10-08T08:00:00.000Z', intensity: 4, passed: true }] }, {});
  const reorder = value => Array.isArray(value) ? value.map(reorder) : value && typeof value === 'object' ? Object.fromEntries(Object.keys(value).reverse().map(key => [key, reorder(value[key])])) : value;
  const db = database(reorder(state));
  const result = await saveCloudState(db.client, 'owner', state);
  assert.equal(result.error, undefined); assert.equal(db.writes(), 0);
});
