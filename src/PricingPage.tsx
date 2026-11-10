// PricingPage.tsx - FIXED v2 - Standalone, no props required
// BEFORE: needed onCheckout prop from App.tsx, build failed if App did not pass it
// AFTER: works alone, calls /api/create-checkout itself. Replace old file with this one.

import { useState } from 'react';

type Billing = 'monthly' | 'yearly' | 'lifetime';

export default function PricingPage() {
  const [sel, setSel] = useState<Billing>('yearly');
  const [msg, setMsg] = useState('');

  async function goCheckout() {
    setMsg('Opening checkout...');
    try {
      const res = await fetch('/api/create-checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ billing: sel }),
      });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        setMsg(data.error || 'Checkout failed. Sign in first, then try again.');
      }
    } catch {
      setMsg('Checkout failed. Check connection and try again.');
    }
  }

  return (
    <main>
      <h1>Clear+ Pricing</h1>
      <p>Free for your first 3 Urge Surfs. Pro for every surf after.</p>
      <div>
        <button onClick={() => setSel('yearly')}>Yearly AUD $59.99 / year - BEST VALUE - 7-day free trial</button>
        <button onClick={() => setSel('monthly')}>Monthly AUD $12.99 / month</button>
        <button onClick={() => setSel('lifetime')}>Lifetime AUD $179 once - Founder, limited to 100</button>
      </div>
      <button onClick={goCheckout}>Continue with {sel}</button>
      {msg ? <p>{msg}</p> : null}
      <p>Cancel anytime. Restore Purchases in Settings. Prices in AUD.</p>
      <ul>
        <li>Free: 3 Urge Surfs, 1 plan, 7 days history</li>
        <li>Pro: Unlimited surfs, sync, full history, weekly exercises</li>
      </ul>
    </main>
  );
}
