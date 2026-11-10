// src/lib/premiumCache.ts - 7 day grace cache, $0, no new service
// Never use localStorage alone as truth. This is a cache, server is truth when online.
const KEY = 'clearplus_premium_cache_v1';
const GRACE_MS = 7 * 24 * 60 * 60 * 1000;

export type CachedPremium = { paid: boolean; billing: string; verifiedAt: string };

export function readCachedPremium(): CachedPremium | null {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const data = JSON.parse(raw) as CachedPremium;
    if (!data.verifiedAt) return null;
    return data;
  } catch { return null; }
}

export function writeCachedPremium(data: CachedPremium) {
  try { localStorage.setItem(KEY, JSON.stringify(data)); } catch {}
}

export function isGraceValid(cached: CachedPremium | null): boolean {
  if (!cached || !cached.paid) return false;
  const age = Date.now() - new Date(cached.verifiedAt).getTime();
  return age < GRACE_MS;
}

// Usage in App.tsx:
// const cached = readCachedPremium();
// if (navigator.onLine) { verify via /api/verify-checkout, then writeCachedPremium }
// else if (isGraceValid(cached)) { keep Pro on, show subtle "Verifying..." badge }
// else { show paywall }
