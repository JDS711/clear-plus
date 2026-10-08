import React, { useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { fiveMinutePauseRemaining } from '../lib/progress.js';
import './remodel.css';
import { REGIONS, formatMoney } from '../lib/regions.js';

export const milestones = [
  ['Around 20 minutes', 'Your heart begins to respond', 'Heart rate slows and blood pressure starts to decrease.'],
  ['Within a day', 'Less carbon monoxide', 'Blood carbon monoxide falls towards normal, helping oxygen reach your heart and muscles.'],
  ['Within a week', 'Small changes you may notice', 'Taste and smell may improve. Your lungs’ cleaning system begins to recover.'],
  ['Within two months', 'Breathing and circulation', 'Coughing and wheezing may ease, and blood flow to your hands and feet improves.'],
  ['Within six months', 'Your lungs keep recovering', 'Lung function improves and phlegm may decrease.'],
  ['After one year', 'A healthier direction', 'Your lungs are healthier than if you had continued smoking.'],
  ['Within two to five years', 'Long-term benefits build', 'Heart attack and stroke risk drops substantially and continues to decline.'],
];
type Props = {
  quitDate: Date | null; setQuitDate: (d: Date) => void; now: Date;
  cigs: number; pack: number; price: number; region: string; currency: string; signedIn: boolean;
  setCigs: (n: number) => void; setPack: (n: number) => void; setPrice: (n: number) => void;
  onEditAssumptions: () => void;
  onLog: () => void; onJournal: () => void; onAnalytics: () => void; onShare: () => void;
  isPremium: boolean; onUpgrade: () => void;
};
export default function Remodel(p: Props) {
  const support = REGIONS[p.region];
  const money = (n: number) => formatMoney(n, p.currency, p.region);
  const [showDate, setShowDate] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const [pauseEnd, setPauseEnd] = useState<number | null>(null);
  const [status, setStatus] = useState('');
  const elapsed = p.quitDate ? Math.max(0, (p.now.getTime() - p.quitDate.getTime()) / 86400000) : 0;
  const daily = p.pack > 0 ? p.cigs * p.price / p.pack : 0;
  const future = p.quitDate && p.quitDate > p.now;
  const remaining = pauseEnd ? fiveMinutePauseRemaining(pauseEnd, Date.now()) : 300;
  const dateValue = p.quitDate ? new Date(p.quitDate.getTime() - p.quitDate.getTimezoneOffset() * 60000).toISOString().slice(0, 16) : '';
  async function shareEstimate() {
    const text = `Potential annual spending avoided: ${money(daily * 365)}. Example based on ${p.cigs} cigarettes/day and ${money(p.price)} per ${p.pack}-pack for 365 days. Excludes quit-support costs. Calculate your own: https://www.clear-plus.app/`;
    try { await navigator.clipboard.writeText(text); setStatus('Savings estimate copied.'); }
    catch { setStatus(text); }
  }
  return <div className="remodel">
    <div className="intro"><div><div className="eyebrow">A little clearer, every day</div><h1>One day at a time.</h1><p>Your progress. Your reasons. Your fresh start.</p></div></div>
    <div className="new-grid"><section className="new-card journey"><div className="eyebrow">Your smoke-free journey</div><div className="big-number">{!p.quitDate ? 'Your day one' : future ? `${Math.ceil((p.quitDate.getTime() - p.now.getTime()) / 86400000)} days to go` : <>{Math.floor(elapsed)} <span>days smoke-free</span></>}</div><p>{!p.quitDate ? 'Start with a date. Take it at your pace.' : future ? 'Your fresh start is ahead.' : `${Math.floor(elapsed % 1 * 24)} hours · ${Math.floor(elapsed * 1440 % 60)} minutes. Every step counts.`}</p><button onClick={() => setShowDate(!showDate)}>{p.quitDate ? 'Edit quit date' : 'Set my quit date'}</button>
      {showDate && <form className="date-form" onSubmit={e => { e.preventDefault(); const value = new FormData(e.currentTarget).get('quitDate') as string; const date = new Date(value); if (Number.isFinite(date.getTime())) { p.setQuitDate(date); setShowDate(false); } }}><label>Quit date and time<input aria-label="Quit date and time" name="quitDate" type="datetime-local" defaultValue={dateValue} required /></label><button>Save date</button></form>}
      <div className="new-stats"><div><strong>{p.quitDate ? Math.floor(elapsed * p.cigs).toLocaleString() : '—'}</strong><small>estimated cigarettes avoided</small></div><div><strong>{p.quitDate ? money(elapsed * daily) : '—'}</strong><small>estimated spending avoided</small></div></div><small>Based on your date and previous costs; assumes no cigarettes since that date.</small>
    </section><section className="new-card soft"><div className="eyebrow">Here for the hard moments</div><h2>A craving doesn’t have to decide your day.</h2><p>Give yourself a five-minute pause. Get a drink, change what you’re doing, or reach out for support.</p><button type="button" className="craving-help-toggle inline-flex items-center gap-2" aria-expanded={showHelp} aria-controls="five-minute-pause" onClick={() => setShowHelp(!showHelp)}>Help me through a craving {showHelp ? <ChevronUp aria-hidden="true" className="w-4 h-4 shrink-0" /> : <ChevronDown aria-hidden="true" className="w-4 h-4 shrink-0" />}</button><p>{support.tel ? <a href={`tel:${support.tel}`}>Call {support.supportName} · {support.phone}</a> : <a href={support.url} target="_blank" rel="noreferrer">Find local quit-smoking support</a>}</p><small>Needing support is normal. You don’t have to rely on willpower alone. Phone services are for callers in the selected country. </small>
      {showHelp && <div id="five-minute-pause" className="pause-panel"><ol><li><b>Delay</b> acting on the urge.</li><li><b>Breathe</b> slowly and comfortably.</li><li><b>Drink water.</b></li><li><b>Do something different.</b></li></ol><strong role="timer">{Math.floor(remaining / 60)}:{String(remaining % 60).padStart(2, '0')}</strong><button disabled={!!pauseEnd && remaining > 0} onClick={() => setPauseEnd(Date.now() + 300000)}>{pauseEnd && remaining === 0 ? 'Try another five minutes' : 'Start five-minute pause'}</button>{pauseEnd && remaining === 0 && <p role="status">Pause complete. If the urge is still strong, try another activity or reach out.</p>}<small>Timing varies. <a href="https://www.quit.org.au/en/how-to-quit/the-first-few-days" target="_blank" rel="noreferrer">The 4Ds from Quit</a>.</small></div>}
    </section>
    <section className="new-card wide" id="savings-calculator"><div className="eyebrow">What could you keep?</div><h2>Your savings estimate</h2><div className="baseline-summary"><span>{p.cigs} cigarettes/day</span><span>{p.pack} per pack</span><span>{money(p.price)} per pack</span><button className="secondary" onClick={p.onEditAssumptions}>Edit assumptions</button></div><div className="new-results">{[['per day', 1], ['per week', 7], ['average month', 365 / 12], ['per year', 365]].map(([label, multiplier]) => <div key={label}><strong>{money(daily * Number(multiplier))}</strong><small>{label}</small></div>)}</div><small>Daily cost = cigarettes/day × pack price ÷ pack size. Estimates exclude quit-support costs and price changes.</small><div className="new-actions"><button onClick={shareEstimate}>Copy my savings estimate</button><button className="secondary" onClick={p.onShare}>Preview & share progress</button></div><p role="status">{status}</p></section>
    <section className="new-card wide"><div className="eyebrow">Your everyday tools</div><h2>Keep the next step simple.</h2><div className="new-actions"><button onClick={p.onLog}>Log a craving</button><button className="secondary" onClick={p.onJournal}>Write a check-in</button><button className="secondary" onClick={p.onAnalytics}>View analytics & achievements</button></div><small>{p.signedIn ? "Your journal and craving history are saved in this browser and synced to your account." : "Your journal and craving history remain saved in this browser."}</small></section>
    <section className="new-card wide" id="recovery"><div className="eyebrow">Good changes take time</div><h2>Your body has reasons to keep going.</h2><p>Typical benefits after stopping smoking. Timing varies; these are general milestones, not measurements of your body.</p><div className="new-timeline">{milestones.map(([when, title, description]) => <article key={when}><small>{when}</small><h3>{title}</h3><p>{description}</p></article>)}</div><small>Source: <a href="https://www.health.gov.au/our-work/dont-make-smokes-your-story/health-benefits" target="_blank" rel="noreferrer">Australian Government health benefits timeline</a> · checked 29 September 2026.</small><p className="new-note">Smoke-free isn’t the same as nicotine-free. Nicotine replacement therapy supplies nicotine to help with withdrawal; it doesn’t erase smoke-free progress. <a href="https://www.healthdirect.gov.au/medicines-to-treat-nicotine-dependence" target="_blank" rel="noreferrer">Learn about quitting medicines.</a></p></section>
    </div><section className="new-story" id="founder"><div className="eyebrow">Built from lived experience</div><h2>Twenty years smoking.<br />A different life on the other side.</h2><blockquote>“I smoked for 20 years, up to about 30 cigarettes a day. I quit around 10 years ago. For me, it was one day at a time.”</blockquote><p>Clear+ grew from that experience: a place to see your progress, remember your reasons and take the next step. No judgement about how you get there.</p><small>Personal experience is not a guarantee of someone else’s results.</small>
    <h2 className="mt-8">Know what you’re getting.</h2><p>The timer, calculator, recovery guide and five-minute craving pause are free. Premium adds savings projections and progress rewards.</p>{!p.isPremium && <button onClick={p.onUpgrade}>See premium options</button>}<details><summary>Where does my information go?</summary><p>Your quit date, costs, journal and cravings are saved in this browser. Signing in also syncs them to your account through Supabase. Clearing browser data or switching devices can lose unsynced information. Clear+ does not hold your estimated savings as money or offer cash withdrawals.</p></details><details><summary>What if I have a setback?</summary><p>A setback doesn’t erase what you’ve learned. You can update your quit date in Settings; your journal and craving history stay available. Savings are estimates assuming no smoking since the selected date.</p></details><details><summary>About the health information</summary><p>General information and personal tracking, not medical treatment. Talk with a doctor or pharmacist about individual advice. The organisations linked above are sources, not endorsers of Clear+.</p></details></section>
  </div>;
}
