import { ownsPurchase } from './auth.js';
import { prices } from './prices.js';
import { SESSION_RE } from './verify.js';

export const PORTAL_POLICY = 'clear-plus-cancel-v1';
export const BILLING_RETURN_URL = 'https://www.clear-plus.app/#settings';
const objectId = value => typeof value === 'string' ? value : value?.id;

// Billing must remain manageable even when a failed payment has removed Premium.
// Never accept a browser-supplied customer or subscription ID.
export function ownedBillingCustomer(session, user) {
  if (!ownsPurchase(session, user) || session?.status !== 'complete') return null;
  const plan = session?.metadata?.billing_type;
  if (!['monthly', 'yearly'].includes(plan)) return null;
  const items = session?.line_items?.data;
  if (items?.length !== 1 || items[0]?.price?.id !== prices()[plan]) return null;
  const customer = objectId(session.customer);
  const subscription = session.subscription;
  if (!/^cus_[A-Za-z0-9]+$/.test(customer || '') ||
    !/^sub_[A-Za-z0-9]+$/.test(subscription?.id || '') ||
    objectId(subscription.customer) !== customer) return null;
  return customer;
}

export function isSafePortalConfiguration(config) {
  return config?.active === true &&
    config?.metadata?.app_policy === PORTAL_POLICY &&
    config?.features?.subscription_cancel?.enabled === true &&
    config.features.subscription_cancel.mode === 'at_period_end' &&
    config.features.subscription_cancel.proration_behavior === 'none';
}

const expand = ['line_items', 'subscription'];
export async function createBillingPortal(stripe, user, sessionId, env = process.env) {
  if (!user?.id || !user?.email || !user.email_confirmed_at) return { code: 401 };
  let customer;
  if (sessionId) {
    if (typeof sessionId !== 'string' || !SESSION_RE.test(sessionId)) return { code: 400 };
    const session = await stripe.checkout.sessions.retrieve(sessionId, { expand });
    if (!ownsPurchase(session, user)) return { code: 403 };
    customer = ownedBillingCustomer(session, user);
  } else {
    // A declined renewal can erase the local Premium session. Discover purchases
    // by verified email, but still check the account ID and price on each session.
    const customers = await stripe.customers.list({ email: user.email, limit: 10 });
    for (const candidate of customers.data) {
      const sessions = await stripe.checkout.sessions.list({ customer: candidate.id, limit: 50 });
      for (const item of sessions.data) {
        if (!ownsPurchase(item, user) || item.status !== 'complete' ||
          !['monthly', 'yearly'].includes(item.metadata?.billing_type)) continue;
        const session = await stripe.checkout.sessions.retrieve(item.id, { expand });
        customer = ownedBillingCustomer(session, user);
        if (customer) break;
      }
      if (customer) break;
    }
  }
  if (!customer) return { code: 404 };
  let config;
  if (env.STRIPE_PORTAL_CONFIGURATION_ID) {
    config = await stripe.billingPortal.configurations.retrieve(env.STRIPE_PORTAL_CONFIGURATION_ID);
  } else {
    const configs = await stripe.billingPortal.configurations.list({ active: true, limit: 100 });
    config = configs.data.find(isSafePortalConfiguration);
  }
  // No fallback to an unrelated account-wide default or immediate-cancel policy.
  if (!isSafePortalConfiguration(config)) return { code: 503 };
  const portal = await stripe.billingPortal.sessions.create({
    customer,
    configuration: config.id,
    return_url: BILLING_RETURN_URL,
  });
  const url = new URL(portal.url);
  if (url.protocol !== 'https:' || url.hostname !== 'billing.stripe.com') return { code: 502 };
  return { code: 200, url: portal.url };
}