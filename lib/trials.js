// Shared server policy. A $0 recurring price is not a trial of the paid monthly price.
export const MONTHLY_TRIAL_DAYS = 30;
const MAX_TRIAL_SECONDS = MONTHLY_TRIAL_DAYS * 24 * 60 * 60;

// These fields are read from Stripe, never from browser-local entitlement flags.
// Retain the history check after conversion: the original Checkout Session remains
// no_payment_required even after Stripe starts charging the subscription.
export function hasMonthlyTrialHistory(session) {
  const subscription = session?.subscription;
  const start = subscription?.trial_start;
  const end = subscription?.trial_end;
  return session?.metadata?.billing_type === 'monthly' &&
    session?.metadata?.trial_period_days === String(MONTHLY_TRIAL_DAYS) &&
    Number.isInteger(start) && Number.isInteger(end) &&
    start > 0 && end > start && end - start <= MAX_TRIAL_SECONDS;
}

export function isCurrentMonthlyTrial(session, nowSeconds = Date.now() / 1000) {
  return hasMonthlyTrialHistory(session) &&
    session.subscription.status === 'trialing' &&
    session.subscription.trial_start <= nowSeconds &&
    nowSeconds < session.subscription.trial_end;
}