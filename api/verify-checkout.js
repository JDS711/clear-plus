import { authenticatedUser } from '../lib/auth.js';
import { resolveSession } from '../lib/verify.js';

// Answers ONE question: is this Stripe session a real, still-current purchase?
//
// It is used in two places:
//   1. the redirect straight after payment (?session_id=…)
//   2. the ON-LOAD entitlement check, which is what makes localStorage clear_isPremium
//      worthless to anyone trying to set it by hand
//
// Both callers get the same answer from the same code, which is why this is not duplicated into
// a second endpoint. Identical endpoints drift.
export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'GET') return res.status(405).json({ paid: false });

  let user;
  try { user = await authenticatedUser(req); } catch { return res.status(503).json({ paid: false, temporary: true }); }
  if (!user) return res.status(401).json({ paid: false, needsSignIn: true });
  const result = await resolveSession(req.query?.session_id, process.env, user);
  if (!result.ok) return res.status(result.code).json({ paid: false });

  return res.status(200).json({
    paid: result.paid,
    ...(result.paid ? { billing: result.billing } : {}),
  });
}
