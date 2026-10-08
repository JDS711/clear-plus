// JSONB can reorder object keys. Compare content, never insertion order.
// Arrays retain their order, and standard JSON omission/toJSON rules are preserved.
function ordered(value) {
  if (value && typeof value.toJSON === 'function') return ordered(value.toJSON());
  if (Array.isArray(value)) return value.map(ordered);
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.keys(value).sort().map(key => [key, ordered(value[key])]));
  }
  return value;
}
export const cloudStateKey = state => JSON.stringify(ordered(state));
export const cloudStatesEqual = (left, right) => cloudStateKey(left) === cloudStateKey(right);
