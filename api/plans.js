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
// There is deliberately NO cache here. One was tried, with a 60 second lifetime, and it caused
// more confusion than it saved: a new deployment rolls out across instances over a short window,
// so different instances could answer from different builds, and the paywall appeared to hide a
// plan that was in fact available. The endpoint is only called when the paywall opens, so the
// Stripe calls it makes are trivial - not worth a stale answer for.

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'GET') return res.status(405).json({});

  try {
    return res.status(200).json(await planAvailability());
  } catch {
    // Unknown, not "nothing works". The client treats {} as "show everything".
    return res.status(200).json({});
  }
}
