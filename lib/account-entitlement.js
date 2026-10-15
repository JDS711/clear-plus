// Only authenticated server responses may unlock Premium. A checkout reference is
// a lookup hint, never an entitlement. Keep failed references so retries can recover.
export async function loadAccountEntitlement(fetcher, token, sessionId = '') {
  const options = { headers: { Authorization: 'Bearer ' + token }, cache: 'no-store' };
  const read = async url => {
    const response = await fetcher(url, options);
    if (response.status >= 500) throw new Error('Access verification temporarily unavailable');
    if (response.status === 401) return { paid: false, needsSignIn: true };
    if (!response.ok) return { paid: false };
    const data = await response.json();
    if (data.temporary) throw new Error('Access verification temporarily unavailable');
    // Never unlock an expired trial from a delayed/cached response.
    if (data.trialEnd && data.trialEnd * 1000 <= Date.now()) return { paid: false };
    return data;
  };
  if (sessionId) {
    const result = await read('/api/verify-checkout?session_id=' + encodeURIComponent(sessionId));
    if (result.paid || result.needsSignIn) return { ...result, sessionId };
  }
  // Signed-in ownership is enforced by restore-access, including trial sessions.
  return read('/api/restore-access');
}
