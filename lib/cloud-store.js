import { reconcileCloudStates } from './cloud-sync.js';

// Compare-and-swap the row timestamp. A concurrent writer causes a re-read/merge, not silent loss.
export async function saveCloudState(client, userId, local, options = {}) {
  for (let attempt = 0; attempt < 3; attempt++) {
    if (options.cancelled?.()) return { cancelled: true };
    const { data: row, error } = await client.from('user_state').select('state,updated_at').eq('user_id', userId).maybeSingle();
    if (error) return { error };
    if (options.cancelled?.()) return { cancelled: true };
    const state = reconcileCloudStates(local, row?.state || {}, options);
    if (row && JSON.stringify(state) === JSON.stringify(row.state)) return { state };
    const updated_at = new Date(Math.max(Date.now(), (Date.parse(row?.updated_at) || 0) + 1)).toISOString();
    if (!row) {
      const created = await client.from('user_state').insert({ user_id: userId, state, updated_at });
      if (!created.error) return { state };
      if (created.error.code === '23505') continue;
      return { error: created.error };
    }
    let update = client.from('user_state').update({ state, updated_at }).eq('user_id', userId);
    update = row.updated_at ? update.eq('updated_at', row.updated_at) : update.is('updated_at', null);
    const saved = await update.select('state').maybeSingle();
    if (saved.error) return { error: saved.error };
    if (saved.data) return { state: saved.data.state };
  }
  return { error: { code: 'SYNC_CONFLICT', message: 'Another device is updating. Please retry.' } };
}
export function syncErrorLabel(error) {
  const code = error?.code || 'NETWORK';
  if (['PGRST205', '42P01'].includes(code)) return `Cloud storage is not configured (${code}).`;
  if (['42501', 'PGRST301', '401'].includes(code)) return `Account or database permission problem (${code}). Try signing in again.`;
  if (code === '42703') return `Cloud storage schema needs updating (${code}).`;
  if (code === 'SYNC_CONFLICT') return 'Another device is updating. Please retry sync.';
  return `Sync could not complete (${code}). Your progress remains on this device.`;
}
