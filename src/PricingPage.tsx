// src/PricingPage.tsx - Free SEO page, same copy as Paywall, so Google sends buyers
// Route: /pricing in App.tsx or vite. No paid tool needed.
import { useState } from 'react';

export default function PricingPage({ onCheckout }: { onCheckout: (b: 'monthly'|'yearly'|'lifetime') => void }) {
  const [sel, setSel] = useState<'yearly'|'monthly'|'lifetime'>('yearly');
  return (
    <main>
      <h1>Clear+ Pricing - Stay Clear Every Day</h1>
      <p>Urge surfing that works when you need it. Free for your first 3 surfs. Pro for every surf after.</p>
      <h2>What is urge surfing?</h2>
      <p>Urge surfing is noticing a craving like a wave, riding it for a few minutes, and watching it pass without acting on it. Clear+ guides you through it, tracks your streak, and keeps your progress safe.</p>
      <div>
        <button onClick={() => setSel('yearly')}>Yearly AUD $59.99 / year - BEST VALUE - 7-day free trial</button>
        <button onClick={() => setSel('monthly')}>Monthly AUD $12.99 / month</button>
        <button onClick={() => setSel('lifetime')}>Lifetime AUD $179 once - Founder, limited to 100</button>
      </div>
      <button onClick={() => onCheckout(sel)}>Continue with {sel}</button>
      <p>Cancel anytime. Restore Purchases in Settings. Prices in AUD.</p>
      <h2>Free vs Pro</h2>
      <ul><li>Free: 3 Urge Surfs, 1 plan, 7 days history</li><li>Pro: Unlimited surfs, sync, full history, weekly exercises</li></ul>
    </main>
  );
}
