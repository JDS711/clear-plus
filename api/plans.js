import { planAvailability } from '../lib/plans.js';

// Reports which plans Stripe will actually accept right now.
//
// The paywall uses this so it never advertises a plan that errors on click. It is the endpoint
// that was missing when the $49.95 lifetime option sat there returning 502.
//
// Deliberately NOT a hard gate. A failed or missing answer is returned as an empty object, and
// the client treats "no answer" and "everything unavailable" as unknown, then shows every plan.
// Hiding a plan that could have sold is worse than showing one that fails, so this endpoint is
// never allowed to be the thing that costs a sale.
//
// Cached briefly in-process: the paywall only asks when it opens, and this keeps a burst of
// opens from turning into a burst of Stripe calls.

const TTL_MS = 60_000;
let cache = { at: 0, value: null };

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'GET') return res.status(405).json({});

  try {
    const now = Date.now();
    if (cache.value && now - cache.at < TTL_MS) return res.status(200).json(cache.value);

    const value = await planAvailability();
    cache = { at: now, value };
    return res.status(200).json(value);
  } catch {
    // Unknown, not "nothing works". The client treats {} as "show everything".
    return res.status(200).json({});
  }
}
