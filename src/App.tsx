import Remodel from './Remodel';
import { countDailyLogs, canSaveCraving } from '../lib/cravings.js';
import { Analytics } from "@vercel/analytics/react";
import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  Wind, Heart, Clock, DollarSign, Cigarette, X, Plus, Sparkles, Flame, Activity, Brain, Settings,
  Play, Pause, RotateCcw, ShieldCheck, Leaf, Droplets, Bell, Download, Smartphone, Wallet, Crown, Lock,
  BarChart3, CalendarDays, Gift, Plane, Milk, ShoppingBag, BookOpen, Phone, Info, Zap, TrendingUp,
  PiggyBank, Check, Star, Quote, Menu, LayoutDashboard, NotebookPen, Trophy, LifeBuoy, ArrowRight,
  MapPin, Upload, Share2, Instagram, Facebook, ExternalLink, QrCode, Copy, ChevronDown, Users, TimerReset,
  BadgeCheck, Rocket, Eye, MousePointerClick
} from 'lucide-react';

type Craving = { id: string; time: Date; intensity: number; trigger: string; passed: boolean; note?: string };
type JournalEntry = { id: string; date: Date; mood: 'great' | 'ok' | 'tough'; text: string };
type Toast = { id: string; title: string; body: string };
type Tab = 'analytics' | 'dashboard' | 'sos' | 'journal' | 'rewards' | 'settings';
type Mode = 'landing' | 'app';
type ShareType = 'money' | 'days';

const QUOTES = [
  "Take a pause. Cravings pass, and support can help.",
  "You're not giving something up. You're getting your life back.",
  "The lungs you save are your own.",
  "One day at a time. One craving at a time.",
];

export default function App() {
  // === MODE ===
  // === MODE ===
  const [mode, setMode] = useState<Mode>('app');

  // === CORE STATE ===
  const [quitDate, setQuitDate] = useState<Date | null>(() => {
    try {
      const stored = localStorage.getItem('clear_quitDate');
      const date = stored ? new Date(stored) : null;
      if (date && Number.isFinite(date.getTime())) return date;
    } catch {}
    return null;
  });
  const [cigsPerDay, setCigsPerDay] = useState(() => {
    try { const v = localStorage.getItem('clear_cigsPerDay'); return v ? parseInt(v) : 20; } catch { return 20; }
  });
  const [costPerPack, setCostPerPack] = useState(() => {
    try { const v = localStorage.getItem('clear_costPerPack'); return v ? parseFloat(v) : 50; } catch { return 50; }
  });
  const [packSize, setPackSize] = useState(() => {
    try { const v = localStorage.getItem('clear_packSize'); return v ? parseInt(v) : 25; } catch { return 25; }
  });
  // Premium is NEVER read from storage.
  //
  // It used to be `localStorage.getItem('clear_isPremium') === 'true'`, which meant anyone could
  // open devtools, run localStorage.setItem('clear_isPremium','true'), reload, and have a free
  // permanent subscription. A boolean the user can edit is not an entitlement.
  //
  // It is now derived from a server check on every load — see the session_id handling below.
  // It starts false and stays false until Stripe says otherwise.
  const [isPremium, setIsPremium] = useState(false);
  const [activeTab, setActiveTab] = useState<Tab>('dashboard');
  const [showPaywall, setShowPaywall] = useState(false);
  const [paywallFeature, setPaywallFeature] = useState('Premium Analytics');
  const [billing, setBilling] = useState<'monthly' | 'yearly' | 'lifetime'>('yearly');

  // Which plans Stripe will actually accept, reported by /api/plans when the paywall opens.
  // null means "not asked yet, or no usable answer".
  const [planAvailability, setPlanAvailability] = useState<Record<string, boolean> | null>(null);

  // Plans the paywall must not advertise.
  //
  // Only an explicit `false` hides a plan. A missing answer leaves everything visible, because
  // hiding a plan that could have sold costs a sale while showing a broken one only costs a click.
  // If EVERY plan reports unavailable we distrust the report entirely: that is far more likely to
  // be a Stripe hiccup than all three prices genuinely going dead at the same moment.
  const allPlans = ['monthly', 'yearly', 'lifetime'] as const;
  const unavailablePlans = planAvailability
    ? allPlans.filter((p) => planAvailability[p] === false)
    : [];
  const hiddenPlanSet = new Set<string>(
    unavailablePlans.length === allPlans.length ? [] : unavailablePlans
  );
  const [now, setNow] = useState(new Date());
  const [showSOSFull, setShowSOSFull] = useState(false);
  const [showCravingForm, setShowCravingForm] = useState(false);
  const [showInstallHelp, setShowInstallHelp] = useState(false);
  const [cravingIntensity, setCravingIntensity] = useState(6);
  const [cravingTrigger, setCravingTrigger] = useState('Stress');
  const [cravingNote, setCravingNote] = useState('');
  const [journalText, setJournalText] = useState('');
  const [journalMood, setJournalMood] = useState<JournalEntry['mood']>('ok');
  const [breathPhase, setBreathPhase] = useState<'inhale' | 'hold' | 'exhale' | 'rest'>('inhale');
  const [breathRunning, setBreathRunning] = useState(false);
  const [breathCount, setBreathCount] = useState(0);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [showSuccessCelebration, setShowSuccessCelebration] = useState(false);
  // The fabricated "community saved" counter was removed deliberately. It was never
  // rendered, and no such aggregate exists. Do not reintroduce invented social proof.
  const [utm, setUtm] = useState<Record<string, string>>({});
  const [referral, setReferral] = useState<string>('');

  // Share modal
  const [showShare, setShowShare] = useState(false);
  const [shareType, setShareType] = useState<ShareType>('money');
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const [cravings, setCravings] = useState<Craving[]>(() => {
  try {
    const s = localStorage.getItem('clear_cravings');
    if (s) {
      const parsed = JSON.parse(s);
      return parsed.map((c: any) => ({ ...c, time: new Date(c.time) }));
    }
  } catch {}
  return [];
});
  const [journals, setJournals] = useState<JournalEntry[]>(() => {
  try {
    const s = localStorage.getItem('clear_journals');
    if (s) {
      const parsed = JSON.parse(s);
      return parsed.map((j: any) => ({ ...j, date: new Date(j.date) }));
    }
  } catch {}
  return [];
});

  // === EFFECTS ===
  useEffect(() => { const id = setInterval(() => setNow(new Date()), 1000); return () => clearInterval(id); }, []);


  useEffect(() => {
    try {
      if (quitDate && Number.isFinite(quitDate.getTime())) {
        localStorage.setItem('clear_quitDate', quitDate.toISOString());
      } else {
        localStorage.removeItem('clear_quitDate');
      }
      localStorage.setItem('clear_cigsPerDay', String(cigsPerDay));
      localStorage.setItem('clear_costPerPack', String(costPerPack));
      localStorage.setItem('clear_packSize', String(packSize));
      // `clear_isPremium` is deliberately NOT written any more. Entitlement lives in Stripe, not
      // in the browser; mirroring it here is what made the flag worth forging.
      localStorage.setItem('clear_mode', mode);
      if (referral) localStorage.setItem('clear_referral', referral);
    } catch {}
  }, [quitDate, cigsPerDay, costPerPack, packSize, mode, referral]);

  useEffect(() => {
    try {
      // One-time cleanup of the dead entitlement flag.
      //
      // `clear_isPremium` used to be the source of truth, so every returning user still carries it
      // in their browser. Nothing reads it any more, but leaving a forgeable-looking entitlement
      // flag lying around invites someone to later "fix" it back into the code, and it is stale
      // state we no longer own. Removing it is safe precisely because nothing reads the key.
      try { localStorage.removeItem('clear_isPremium'); } catch {}

      const p = new URLSearchParams(window.location.search);
      const utmObj: Record<string, string> = {};
      ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'ref', 'fbclid', 'gclid'].forEach(k => {
        const v = p.get(k); if (v) utmObj[k] = v;
      });
      if (Object.keys(utmObj).length) {
        setUtm(utmObj);
        if (utmObj.ref) setReferral(utmObj.ref);
        else if (utmObj.utm_source) setReferral(`${utmObj.utm_source}/${utmObj.utm_medium || 'organic'}`);
        localStorage.setItem('clear_utm', JSON.stringify(utmObj));
      } else {
        const stored = localStorage.getItem('clear_utm'); if (stored) setUtm(JSON.parse(stored));
        const r = localStorage.getItem('clear_referral'); if (r) setReferral(r);
      }
      const sessionId = p.get('session_id');

      if (sessionId) {
        // Straight after payment. Verify with Stripe, then REMEMBER THE SESSION ID — that is the
        // credential every future load re-checks. No boolean is stored.
        fetch('/api/verify-checkout?session_id=' + encodeURIComponent(sessionId)).then(r => r.json()).then(data => {
          if (data.paid) {
            setIsPremium(true); setBilling(data.billing); setShowSuccessCelebration(true);
            try { localStorage.setItem('clear_premium_session', sessionId); } catch {}
          } else {
            pushToast({ title: 'Payment not confirmed', body: 'Please check your payment receipt.' });
          }
        }).catch(() => pushToast({ title: 'Unable to verify payment', body: 'Keep your receipt and retry this page.' }));
      } else {
        // Every other load: re-verify the stored session against Stripe.
        //
        // This is the fix. A hand-written `clear_isPremium` now accomplishes nothing — that key is
        // never read — and a cancelled or refunded subscription loses access here, instead of
        // keeping it forever.
        let storedSession = null;
        try { storedSession = localStorage.getItem('clear_premium_session'); } catch {}

        if (storedSession) {
          fetch('/api/verify-checkout?session_id=' + encodeURIComponent(storedSession)).then(r => r.json()).then(data => {
            setIsPremium(!!data.paid);
            if (data.paid && data.billing) setBilling(data.billing);
            // Drop a credential Stripe no longer honours, so we stop re-checking a dead session.
            if (!data.paid) { try { localStorage.removeItem('clear_premium_session'); } catch {} }
          }).catch(() => {
            // Offline, or the server is unreachable. Premium is deliberately left OFF rather than
            // trusting local state, because any local grant is forgeable. See the handover note.
          });
        }
      }
    } catch {}
  }, []);

  // Ask which plans Stripe will actually accept, but only when the paywall opens.
  // Asking on every page load would mean three Stripe calls per visitor for a question that only
  // matters at the moment of purchase.
  useEffect(() => {
    if (!showPaywall || planAvailability) return;
    let cancelled = false;
    fetch('/api/plans')
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (!cancelled && data && typeof data === 'object') setPlanAvailability(data);
      })
      .catch(() => {
        // Leave availability unknown. Every plan stays visible rather than silently disappearing.
      });
    return () => { cancelled = true; };
  }, [showPaywall, planAvailability]);

  useEffect(() => {
    const onBeforeInstall = (e: any) => { e.preventDefault(); setDeferredPrompt(e); };
    const onInstalled = () => { setIsInstalled(true); setDeferredPrompt(null); };
    window.addEventListener('beforeinstallprompt', onBeforeInstall as any);
    window.addEventListener('appinstalled', onInstalled);
    if (window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone) setIsInstalled(true);
    return () => { window.removeEventListener('beforeinstallprompt', onBeforeInstall as any); window.removeEventListener('appinstalled', onInstalled); };
  }, []);

  useEffect(() => {
    if (!breathRunning) return;
    const phases: Array<{ phase: typeof breathPhase; dur: number }> = [
      { phase: 'inhale', dur: 4000 }, { phase: 'hold', dur: 7000 }, { phase: 'exhale', dur: 8000 }, { phase: 'rest', dur: 1000 },
    ];
    let idx = phases.findIndex(p => p.phase === breathPhase);
    const timer = setTimeout(() => { const nextIdx = (idx + 1) % phases.length; if (nextIdx === 0) setBreathCount(c => c + 1); setBreathPhase(phases[nextIdx].phase); }, phases[idx].dur);
    return () => clearTimeout(timer);
  }, [breathPhase, breathRunning]);

  // Leaving SOS must not leave a hidden exercise running or reopen the overlay.
  useEffect(() => {
    setBreathRunning(false);
    setShowSOSFull(false);
  }, [activeTab, mode]);

  useEffect(() => {
    const pauseWhenHidden = () => {
      if (document.hidden) setBreathRunning(false);
    };
    document.addEventListener('visibilitychange', pauseWhenHidden);
    return () => document.removeEventListener('visibilitychange', pauseWhenHidden);
  }, []);

  const pushToast = (t: Omit<Toast, 'id'>) => { const id = Date.now().toString() + Math.random().toString(16).slice(2); setToasts(p => [...p.slice(-3), { ...t, id }]); setTimeout(() => setToasts(p => p.filter(x => x.id !== id)), 4000); };
  const openPaywall = (feature: string) => { setBreathRunning(false); setShowSOSFull(false); setPaywallFeature(feature); setShowPaywall(true); };

  // === CALCS ===
  const diffMs = quitDate ? Math.max(0, now.getTime() - quitDate.getTime()) : 0;
  const totalMins = Math.floor(diffMs / 60000);
  const days = Math.floor(totalMins / 1440);
  const hours = Math.floor((totalMins % 1440) / 60);
  const mins = totalMins % 60;
  const secs = Math.floor((diffMs % 60000) / 1000);
  const cigsAvoided = Math.floor(diffMs / 86400000 * cigsPerDay);
  const pricePerCig = packSize > 0 ? costPerPack / packSize : 0;
  const moneySaved = diffMs / 86400000 * cigsPerDay * pricePerCig;
  const dailyCost = cigsPerDay * pricePerCig;
  const yearlyCost = dailyCost * 365;
  const monthlyCost = dailyCost * 365 / 12;
  const lifeSavedHours = Math.floor((cigsAvoided * 11) / 60);
  const cravingsPassed = cravings.filter(c => c.passed).length;
  const progressPct = Math.min(100, Math.round((totalMins / 43200) * 100));

  const savingsChartData = useMemo(() => {
    const pts = 30;
    const arr = [];
    const start = Math.max(0, days - pts + 1);
    for (let i = 0; i < pts; i++) {
      const d = start + i;
      const saved = (d <= days ? d * dailyCost : 0) + (d === days ? (hours / 24) * dailyCost : 0);
      arr.push({ day: d, saved: Math.max(0, saved) });
    }
    const max = Math.max(...arr.map(a => a.saved), yearlyCost / 12);
    return { points: arr, max: max * 1.1 };
  }, [days, hours, dailyCost, yearlyCost]);

  const heatmap = useMemo(() => {
    const daysArr = Array.from({ length: 35 }, (_, i) => { const d = new Date(); d.setDate(d.getDate() - (34 - i)); d.setHours(12, 0, 0, 0); return d; });
    return daysArr.map(d => {
      const same = cravings.filter(c => new Date(c.time).toDateString() === d.toDateString());
      const avg = same.length ? Math.round(same.reduce((a, b) => a + b.intensity, 0) / same.length) : 0;
      return { date: d, count: same.length, avg };
    });
  }, [cravings]);

  const sosUses = countDailyLogs(cravings, now);
  const addCraving = () => {
    if (!canSaveCraving(cravings, isPremium)) { setShowCravingForm(false); openPaywall('You have saved your 3 free craving logs today. Breathing is always free.'); return; }
    const c: Craving = { id: Date.now().toString(), time: new Date(), intensity: cravingIntensity, trigger: cravingTrigger, passed: false, note: cravingNote.trim() || undefined };
    setCravings(current => [c, ...current]); setShowCravingForm(false); setCravingNote(''); setShowSOSFull(false); setBreathRunning(false);
    pushToast({ title: 'Craving saved', body: 'Start breathing whenever you are ready.' });
  };
  const markCravingPassed = (id: string) => {
    setBreathRunning(false);
    setShowSOSFull(false);
    setCravings(current => current.map(c => c.id === id ? { ...c, passed: true } : c));
  };
  const addJournal = () => { if (!journalText.trim()) return; setJournals([{ id: Date.now().toString(), date: new Date(), mood: journalMood, text: journalText.trim() }, ...journals]); setJournalText(''); pushToast({ title: 'Journal saved', body: 'Your entry is stored locally. Keep going!' }); };

  const handleCheckout = async (plan: 'monthly' | 'yearly' | 'lifetime') => {
    // Refuse a plan the server has already told us Stripe will reject, so the customer gets a
    // sentence instead of a dead end.
    if (hiddenPlanSet.has(plan)) {
      pushToast({ title: 'Plan unavailable', body: 'That plan is temporarily unavailable. The other plans are unaffected.' });
      return;
    }
    try {
      pushToast({ title: 'Opening secure checkout', body: 'Review your plan in Stripe before paying.' });
      const res = await fetch('/api/create-checkout', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ billing: plan }) });
      const data = await res.json();
      if (!res.ok || !data.url) throw new Error('Checkout is unavailable. Please try again later.');
      window.location.assign(data.url);
    } catch {
      pushToast({ title: 'Checkout unavailable', body: 'No upgrade was activated. Please try again later.' });
    }
  };

  const navItems: Array<{ id: Tab; label: string; icon: any; free?: boolean }> = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, free: true },
    { id: 'sos', label: 'SOS', icon: LifeBuoy, free: true },
    { id: 'journal', label: 'Journal', icon: NotebookPen, free: true },
    { id: 'rewards', label: 'Rewards', icon: Trophy, free: false },
    { id: 'analytics', label: 'Progress', icon: BarChart3, free: true },
    { id: 'settings', label: 'Settings', icon: Settings, free: true },
  ];

  const baliFlights = Math.floor(yearlyCost / 900);
  const milkCartons = Math.floor(yearlyCost / 4.5);

  // === SHARE CANVAS ===
  const drawShareCanvas = () => {
    const canvas = canvasRef.current; if (!canvas) return;
    const ctx = canvas.getContext('2d'); if (!ctx) return;
    const W = 1080, H = 1080;
    canvas.width = W; canvas.height = H;
    // bg
    ctx.fillStyle = '#0A0A0B';
    ctx.fillRect(0, 0, W, H);
    // blobs
    const grad1 = ctx.createRadialGradient(200, 200, 0, 200, 200, 600);
    grad1.addColorStop(0, 'rgba(16,185,129,0.18)'); grad1.addColorStop(1, 'transparent');
    ctx.fillStyle = grad1; ctx.fillRect(0, 0, W, H);
    const grad2 = ctx.createRadialGradient(900, 900, 0, 900, 900, 500);
    grad2.addColorStop(0, 'rgba(139,92,246,0.12)'); grad2.addColorStop(1, 'transparent');
    ctx.fillStyle = grad2; ctx.fillRect(0, 0, W, H);
    // grid
    ctx.strokeStyle = 'rgba(255,255,255,0.04)'; ctx.lineWidth = 1;
    for (let i = 0; i < W; i += 54) { ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i, H); ctx.stroke(); }
    for (let i = 0; i < H; i += 54) { ctx.beginPath(); ctx.moveTo(0, i); ctx.lineTo(W, i); ctx.stroke(); }
    // header
    ctx.fillStyle = 'white'; ctx.font = '900 36px Inter, sans-serif'; ctx.fillText('clear-plus1.0', 64, 88);
    ctx.fillStyle = 'rgba(255,255,255,0.9)'; ctx.font = '800 22px Inter, sans-serif'; ctx.fillText('', 168, 84);
    ctx.fillStyle = 'rgba(255,255,255,0.35)'; ctx.font = '600 14px Inter, sans-serif'; ctx.fillText('BY A FORMER SMOKER, FOR FUTURE NON-SMOKERS', 64, 120);
    // pill
    ctx.fillStyle = 'rgba(16,185,129,0.12)'; ctx.strokeStyle = 'rgba(16,185,129,0.25)'; ctx.lineWidth = 1;
    // @ts-ignore roundRect
    if (ctx.roundRect) { ctx.beginPath(); ctx.roundRect(W - 280, 48, 216, 36, 18); ctx.fill(); ctx.stroke(); } else { ctx.fillRect(W - 280, 48, 216, 36); }
    ctx.fillStyle = '#6EE7B7'; ctx.font = '700 13px Inter'; ctx.fillText('PERSONAL ESTIMATE', W - 264, 70);
    // main number
    const mainText = shareType === 'money' ? `$${moneySaved.toFixed(0)}` : `${days} DAYS`;
    const subText = shareType === 'money' ? 'Spending avoided' : 'Smoke-Free';
    ctx.fillStyle = 'white'; ctx.font = '900 168px Inter, sans-serif'; ctx.fillText(mainText, 64, 420);
    ctx.fillStyle = 'rgba(255,255,255,0.55)'; ctx.font = '700 64px Inter'; ctx.fillText(subText, 64, 500);
    // stats row
    ctx.fillStyle = 'rgba(255,255,255,0.06)'; ctx.strokeStyle = 'rgba(255,255,255,0.08)';
    // @ts-ignore
    if (ctx.roundRect) { ctx.beginPath(); ctx.roundRect(64, 560, 952, 140, 24); ctx.fill(); ctx.stroke(); }
    else ctx.fillRect(64, 560, 952, 140);
    ctx.fillStyle = 'rgba(255,255,255,0.35)'; ctx.font = '600 14px Inter'; ctx.fillText('CIGS AVOIDED', 96, 600);
    ctx.fillStyle = 'white'; ctx.font = '800 28px Inter'; ctx.fillText(`${cigsAvoided}`, 96, 640);
    ctx.fillStyle = 'rgba(255,255,255,0.35)'; ctx.font = '600 14px Inter'; ctx.fillText('DAYS', 320, 600);
    ctx.fillStyle = 'white'; ctx.font = '800 28px Inter'; ctx.fillText(`${days}`, 320, 640);
    ctx.fillStyle = 'rgba(255,255,255,0.35)'; ctx.font = '600 14px Inter'; ctx.fillText('CRAVINGS BEATEN', 560, 600);
    ctx.fillStyle = '#6EE7B7'; ctx.font = '800 28px Inter'; ctx.fillText(`${cravingsPassed}`, 560, 640);
    ctx.fillStyle = 'rgba(255,255,255,0.35)'; ctx.font = '600 14px Inter'; ctx.fillText('STARTED', 800, 600);
    ctx.fillStyle = 'white'; ctx.font = '700 18px Inter'; ctx.fillText((quitDate ? quitDate.toLocaleDateString('en-AU') : 'Not set'), 800, 640);
    // quote
    ctx.fillStyle = 'rgba(255,255,255,0.75)'; ctx.font = 'italic 500 22px Inter'; ctx.fillText(`"${QUOTES[days % QUOTES.length]}"`, 64, 780);
    // footer text
    ctx.fillStyle = 'rgba(255,255,255,0.9)'; ctx.font = '700 18px Inter'; ctx.fillText('I quit with clear-plus1.0', 240, 920);
    ctx.fillStyle = 'rgba(255,255,255,0.45)'; ctx.font = '500 15px Inter'; ctx.fillText('www.clear-plus.app • Quitline 13 7848', 240, 948);
    ctx.fillStyle = 'rgba(255,255,255,0.25)'; ctx.font = '500 13px Inter'; ctx.fillText('Not medical advice. You got this.', 240, 972);
  };

  useEffect(() => { if (showShare) setTimeout(drawShareCanvas, 50); }, [showShare, shareType, moneySaved, days, cigsAvoided]);

  const scrollTo = (id: string) => {
    const el = document.getElementById(id);
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    setMobileNavOpen(false);
  };

  const enterApp = (refSource?: string) => {
    if (refSource) setReferral(refSource);
    setMode('app');
    window.scrollTo({ top: 0, behavior: 'smooth' });
    try { localStorage.setItem('clear_mode', 'app'); } catch {}
  };

  // === RENDER ===
  return (
    <div className="clear-shell min-h-screen bg-[#070708] text-white selection:bg-white/20 flex flex-col relative overflow-x-hidden">
      {/* Celebration */}
      {showSuccessCelebration && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 pointer-events-none">
          <div className="pointer-events-auto rounded-[28px] bg-[#121214] border border-emerald-500/30 p-8 text-center shadow-[0_30px_100px_rgba(0,0,0,0.9)] max-w-[420px] w-full">
            <div className="w-16 h-16 rounded-full bg-emerald-500 text-black flex items-center justify-center mx-auto mb-4"><Crown className="w-8 h-8" /></div>
            <div className="text-[22px] font-[900]">You're now clear-plus1.0 🎉</div>
            <div className="text-[13px] text-white/60 mt-2 leading-[1.5]">Premium unlocked. Unlimited SOS, analytics, progress tools. Thanks for supporting free quitters.</div>
            <button onClick={() => setShowSuccessCelebration(false)} className="mt-5 h-11 px-6 rounded-full bg-white text-black font-bold text-[13px]">Let's go</button>
          </div>
        </div>
      )}

      {/* Toasts */}
      <div className="fixed top-[76px] right-4 z-[80] space-y-2 pointer-events-none">
        {toasts.map(t => (
          <div key={t.id} className="pointer-events-auto w-[320px] rounded-[14px] bg-[#1a1a1d] border border-white/[0.10] p-3 shadow-[0_10px_40px_rgba(0,0,0,0.6)]">
            <div className="text-[12px] font-semibold">{t.title}</div><div className="text-[11px] text-white/50 mt-1 leading-[1.4]">{t.body}</div>
          </div>
        ))}
      </div>

      {/* ===== APP MODE ===== */}
      {mode === 'app' && (
        <>
          {/* App Header */}
          <header className="relative z-30 h-[68px] flex items-center justify-between px-4 lg:px-7 border-b border-white/[0.06] bg-[#0e0e10]/90 backdrop-blur-2xl sticky top-0">
            <div className="flex items-center gap-4">
              <button onClick={() => { setActiveTab('dashboard') }} className="w-9 h-9 rounded-[12px] bg-white text-black flex items-center justify-center font-bold shadow-[0_0_20px_rgba(255,255,255,0.15)]"><Wind className="w-5 h-5" /></button>
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-[800] tracking-[-0.03em] text-[18px] leading-none">clear-plus1.0</span>

                  {isPremium && <span className="hidden sm:inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-500/20 text-emerald-300"><Crown className="w-3 h-3" /> PLUS</span>}
                  <button onClick={() => { setActiveTab('dashboard') }} className="hidden sm:flex text-[10px] px-2 py-0.5 rounded-full bg-white/[0.06] border border-white/[0.08] text-white/40 hover:text-white/70">Home</button>
                </div>
                <div className="text-[11px] text-white/40 mt-0.5 hidden sm:block tracking-wide">By a former smoker, for future non-smokers</div>
              </div>
            </div>

            <div className="hidden lg:flex items-center gap-1 p-1 rounded-full bg-white/[0.04] border border-white/[0.06]">
              {navItems.map(it => {
                const active = activeTab === it.id;
                return (
                  <button key={it.id} onClick={() => setActiveTab(it.id)} className={`h-8 px-4 rounded-full text-[12px] font-medium flex items-center gap-1.5 transition ${active ? 'bg-white text-black shadow' : 'text-white/50 hover:text-white/80 hover:bg-white/[0.06]'}`}>
                    <it.icon className="w-3.5 h-3.5" />{it.label}{!it.free && !isPremium && <Lock className="w-3 h-3 opacity-60" />}
                  </button>
                );
              })}
            </div>

            <div className="flex items-center gap-2">
              <div className="hidden sm:flex items-center gap-2 px-3 h-8 rounded-full bg-white/[0.06] border border-white/[0.08]">
                <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" /><span className="text-[11px] text-white/60">LIVE</span><span className="text-[11px] font-bold">{days}d {hours}h</span>
              </div>
              {!isPremium ? (
                <button onClick={() => openPaywall('clear-plus1.0 Premium')} className="h-9 px-4 rounded-full bg-gradient-to-br from-white to-white/80 text-black text-[12px] font-bold flex items-center gap-1.5 hover:scale-[1.02] transition shadow-[0_4px_20px_rgba(255,255,255,0.2)]">
                  <Crown className="w-4 h-4" /> Upgrade
                </button>
              ) : (
                <div className="h-9 px-3 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center gap-1.5 text-[11px] text-emerald-300"><Crown className="w-3.5 h-3.5" /> Premium</div>
              )}
              <button onClick={() => setMobileNavOpen(!mobileNavOpen)} className="lg:hidden w-9 h-9 rounded-full bg-white/[0.06] border border-white/[0.08] flex items-center justify-center"><Menu className="w-4 h-4" /></button>
            </div>
          </header>

          {mobileNavOpen && (
            <div className="lg:hidden relative z-20 bg-[#0e0e10] border-b border-white/[0.06] px-4 py-3 flex gap-2 overflow-x-auto">
              {navItems.map(it => (
                <button key={it.id} onClick={() => { setActiveTab(it.id); setMobileNavOpen(false); }} className={`shrink-0 h-9 px-4 rounded-full text-[13px] font-medium border flex items-center gap-1.5 ${activeTab === it.id ? 'bg-white text-black border-white' : 'bg-white/[0.04] border-white/[0.08] text-white/60'}`}>
                  <it.icon className="w-4 h-4" />{it.label}
                </button>
              ))}
            </div>
          )}

          <main className="relative z-10 flex-1 w-full max-w-[1280px] mx-auto px-4 lg:px-7 py-6">
            {activeTab === 'dashboard' && <Remodel quitDate={quitDate} setQuitDate={setQuitDate} now={now} cigs={cigsPerDay} pack={packSize} price={costPerPack} setCigs={setCigsPerDay} setPack={setPackSize} setPrice={setCostPerPack} onLog={() => setActiveTab('sos')} onJournal={() => setActiveTab('journal')} onAnalytics={() => setActiveTab('analytics')} onShare={() => setShowShare(true)} isPremium={isPremium} onUpgrade={() => openPaywall('clear-plus1.0 Premium')} />}
            {activeTab === 'analytics' && (
                <div className="lg:col-span-5 space-y-6">
                  {/* Premium Analytics */}
                  <div className="rounded-[24px] bg-[#121214] border border-white/[0.06] overflow-hidden relative">
                    <div className="p-5 flex items-center justify-between">
                      <div className="flex items-center gap-2"><div className="w-7 h-7 rounded-[9px] bg-violet-500/15 border border-violet-500/20 flex items-center justify-center"><BarChart3 className="w-4 h-4 text-violet-300" /></div><h2 className="text-[12px] tracking-[0.14em] font-bold text-white/30 uppercase">Premium Analytics</h2></div>
                      {!isPremium && <span className="text-[10px] px-2 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-300 flex items-center gap-1"><Lock className="w-3 h-3" /> LOCKED</span>}
                    </div>
                    <div className="relative">
                      <div className={`${!isPremium ? 'blur-[8px] pointer-events-none select-none' : ''} px-5 pb-5 space-y-5`}>
                        <div className="rounded-[16px] bg-[#0f0f10] border border-white/[0.06] p-4">
                          <div className="flex items-center justify-between mb-3"><span className="text-[11px] font-bold tracking-widest uppercase text-white/30">Cumulative Savings</span><span className="text-[11px] text-emerald-300 font-bold">${moneySaved.toFixed(0)} total</span></div>
                          <div className="h-[110px] w-full relative">
                            <svg viewBox="0 0 300 100" className="w-full h-full">
                              <defs><linearGradient id="g2" x1="0" x2="0" y1="0" y2="1"><stop offset="0%" stopColor="#10b981" stopOpacity="0.4" /><stop offset="100%" stopColor="#10b981" stopOpacity="0" /></linearGradient></defs>
                              {(() => {
                                const pts = savingsChartData.points;
                                const max = savingsChartData.max || 1;
                                const path = pts.map((p, i) => `${i === 0 ? 'M' : 'L'} ${(i / (pts.length - 1)) * 280 + 10} ${90 - (p.saved / max) * 80}`).join(' ');
                                const area = path + ` L ${(pts.length - 1) / (pts.length - 1) * 280 + 10} 90 L 10 90 Z`;
                                return <><path d={area} fill="url(#g2)" /><path d={path} fill="none" stroke="#10b981" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" /></>;
                              })()}
                            </svg>
                            <div className="absolute bottom-0 left-0 right-0 flex justify-between text-[9px] text-white/20 px-2"><span>Day {Math.max(0, days - 29)}</span><span>Today</span><span>Proj +15d</span></div>
                          </div>
                        </div>
                        <div className="rounded-[16px] bg-[#0f0f10] border border-white/[0.06] p-4">
                          <div className="flex items-center justify-between mb-3"><span className="text-[11px] font-bold tracking-widest uppercase text-white/30 flex items-center gap-1.5"><CalendarDays className="w-3.5 h-3.5" /> Craving Heatmap</span><span className="text-[10px] text-white/30">{cravingsPassed} wins</span></div>
                          <div className="grid grid-cols-7 gap-1.5">{heatmap.map((d, i) => { const intensity = d.avg; const bg = intensity === 0 ? 'bg-white/[0.04]' : intensity <= 3 ? 'bg-emerald-500/20' : intensity <= 6 ? 'bg-amber-500/30' : 'bg-rose-500/40'; return <div key={i} className={`aspect-square rounded-[6px] border border-white/[0.04] flex items-center justify-center ${bg}`}><span className={`text-[9px] font-bold ${d.avg > 0 ? 'text-white/80' : 'text-white/15'}`}>{d.count || ''}</span></div>; })}</div>
                        </div>
                      </div>
                      {!isPremium && (
                        <div className="absolute inset-0 bg-gradient-to-t from-[#121214] via-[#121214]/80 to-transparent flex flex-col items-center justify-end p-6 text-center">
                          <div className="w-12 h-12 rounded-full bg-white text-black flex items-center justify-center mb-3 shadow-[0_8px_24px_rgba(255,255,255,0.2)]"><Crown className="w-6 h-6" /></div>
                          <div className="text-[15px] font-bold tracking-[-0.01em]">Unlock Premium Analytics</div>
                          <div className="text-[12px] text-white/50 mt-1 max-w-[260px] leading-[1.5]">Savings chart, heatmap, 1-year projections. In 1 year: ${yearlyCost.toFixed(0)} saved.</div>
                          <button onClick={() => openPaywall('Premium Analytics')} className="mt-4 h-11 px-6 rounded-full bg-white text-black font-bold text-[13px] flex items-center gap-2 hover:bg-white/90"><Crown className="w-4 h-4" /> Unlock with clear-plus1.0</button>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="rounded-[24px] bg-[#121214] border border-white/[0.06] p-5">
                    <div className="flex items-center justify-between mb-4"><h2 className="text-[12px] tracking-[0.14em] font-bold text-white/30 uppercase">Achievements</h2><span className="text-[11px] text-white/30">{cravingsPassed} wins</span></div>
                    <div className="grid grid-cols-4 gap-3">
                      {[
                        { label: '24h', done: days >= 1, icon: '🔥', premium: false },
                        { label: '3 days', done: days >= 3, icon: '🌿', premium: false },
                        { label: '1 week', done: days >= 7, icon: '💪', premium: false },
                        { label: '$500', done: moneySaved >= 500, icon: '💰', premium: true },
                        { label: '100 cigs', done: cigsAvoided >= 100, icon: '🚭', premium: false },
                        { label: 'Beast', done: cravingsPassed >= 5, icon: '🏆', premium: true },
                        { label: 'Bali', done: yearlyCost >= 900, icon: '✈️', premium: true },
                        { label: '1 month', done: days >= 30, icon: '🌟', premium: false },
                      ].map(a => (
                        <div key={a.label} className={`relative aspect-square rounded-[14px] border flex flex-col items-center justify-center gap-1 transition ${a.done ? 'bg-white text-black border-white shadow-[0_4px_20px_rgba(255,255,255,0.12)]' : 'bg-white/[0.04] border-white/[0.06] text-white/20'} ${a.premium && !isPremium ? 'opacity-60' : ''}`}>
                          {a.premium && !isPremium && <Lock className="absolute top-1 right-1 w-3 h-3 text-white/30" />}
                          <span className="text-[18px]">{a.icon}</span><span className="text-[10px] font-bold tracking-wide">{a.label}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
            )}

            {activeTab === 'sos' && (
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                <div className="lg:col-span-7">
                  <div className="rounded-[28px] bg-[#131315] border border-white/[0.08] p-6 lg:p-8">
                    <div className="flex items-center justify-between mb-6">
                      <div className="flex items-center gap-3"><div className="w-9 h-9 rounded-full bg-white text-black flex items-center justify-center"><Wind className="w-5 h-5" /></div><div><div className="text-[14px] font-bold">SOS Breathing • 4-7-8</div><div className="text-[11px] text-white/40">Breathing is always free • {isPremium ? 'Unlimited craving logs' : `${sosUses}/3 craving logs today`}</div></div></div>
                      {!isPremium && sosUses >= 3 && <span className="text-[11px] px-2.5 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-300">Daily log limit reached</span>}
                    </div>
                    <div className="flex flex-col items-center text-center py-6">
                      <div className="text-[11px] tracking-[0.2em] uppercase font-bold text-white/30">Round {breathCount + 1} • {breathPhase}</div>
                      <div className="mt-2 text-[26px] font-[800] capitalize">{breathPhase === 'inhale' ? 'Breathe in slowly' : breathPhase === 'hold' ? 'Hold' : breathPhase === 'exhale' ? 'Breathe out fully' : 'Rest'}</div>
                      <div className="relative w-[260px] h-[260px] flex items-center justify-center mt-8">
                        <div className={`absolute rounded-full border border-white/10 transition-all duration-[1000ms] ${breathPhase === 'inhale' ? 'w-[240px] h-[240px] bg-white/[0.06]' : breathPhase === 'hold' ? 'w-[240px] h-[240px] bg-white/[0.08]' : breathPhase === 'exhale' ? 'w-[120px] h-[120px] bg-white/[0.03]' : 'w-[160px] h-[160px] bg-white/[0.04]'}`} />
                        <div className={`absolute rounded-full bg-gradient-to-br from-emerald-400 to-teal-400 shadow-[0_0_60px_rgba(16,185,129,0.5)] transition-all ease-in-out ${breathPhase === 'inhale' ? 'w-[200px] h-[200px] duration-[4000ms]' : breathPhase === 'hold' ? 'w-[200px] h-[200px] duration-[7000ms]' : breathPhase === 'exhale' ? 'w-[90px] h-[90px] duration-[8000ms]' : 'w-[130px] h-[130px] duration-[1000ms]'}`} />
                        <div className="relative z-10 text-center"><div className="text-[42px] font-[900] tabular-nums">{breathPhase === 'inhale' ? '4s' : breathPhase === 'hold' ? '7s' : breathPhase === 'exhale' ? '8s' : '•'}</div><div className="text-[11px] tracking-widest uppercase text-white/50 font-bold mt-1">{breathPhase}</div></div>
                      </div>
                      <div className="mt-8 flex items-center gap-3">
                        <button onClick={() => {
                          setBreathRunning(!breathRunning);
                        }} className="h-12 px-6 rounded-full bg-white text-black font-bold text-[13px] flex items-center gap-2 hover:bg-white/90">
                          {breathRunning ? <><Pause className="w-4 h-4" /> Pause</> : <><Play className="w-4 h-4" /> Start breathing</>}
                        </button>
                        <button onClick={() => { setBreathCount(0); setBreathPhase('inhale'); }} className="h-12 w-12 rounded-full bg-white/[0.08] border border-white/[0.10] flex items-center justify-center"><RotateCcw className="w-4 h-4" /></button>
                      </div>
                    </div>
                    <div className="mt-6 flex gap-3">
                      <button onClick={() => { const id = cravings.find(c => !c.passed)?.id; if (id) markCravingPassed(id); setBreathRunning(false); setShowSOSFull(false); pushToast({ title: 'Craving beaten 💪', body: 'Take a moment to recognise your progress.' }); }} className="flex-1 h-12 rounded-full bg-emerald-500 text-black font-bold text-[13px] flex items-center justify-center gap-2"><Sparkles className="w-4 h-4" /> I beat the craving</button>
                      <button onClick={() => setShowCravingForm(true)} className="h-12 px-5 rounded-full bg-white/[0.06] border border-white/[0.10] text-[13px]">Log craving</button>
                    </div>
                  </div>
                </div>
                <div className="lg:col-span-5 space-y-6">
                  <div className="rounded-[24px] bg-[#121214] border border-white/[0.06] p-5">
                    <div className="flex items-center justify-between mb-4"><h2 className="text-[12px] tracking-[0.14em] font-bold text-white/30 uppercase">Craving Log</h2><span className="text-[11px] px-2 py-1 rounded-full bg-rose-500/10 border border-rose-500/20 text-rose-300">{cravings.filter(c => !c.passed).length} active</span></div>
                    <div className="space-y-2 max-h-[420px] overflow-auto pr-1">
                      {cravings.map(c => (
                        <div key={c.id} className={`flex items-center gap-3 p-3 rounded-[14px] border ${c.passed ? 'bg-white/[0.03] border-white/[0.04] opacity-60' : 'bg-white/[0.05] border-white/[0.08]'}`}>
                          <div className={`w-9 h-9 rounded-[10px] flex items-center justify-center text-[12px] font-bold shrink-0 ${c.intensity > 7 ? 'bg-rose-500/15 text-rose-300' : c.intensity > 4 ? 'bg-amber-500/15 text-amber-300' : 'bg-emerald-500/15 text-emerald-300'}`}>{c.intensity}</div>
                          <div className="flex-1 min-w-0"><div className="text-[12px] font-medium flex items-center gap-2"><span className="truncate">{c.trigger}</span><span className="text-[10px] text-white/30">• {new Date(c.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span></div>{c.note && <div className="text-[11px] text-white/40 truncate mt-0.5">{c.note}</div>}</div>
                          {!c.passed ? <button onClick={() => markCravingPassed(c.id)} className="h-7 px-2.5 rounded-full bg-white text-black text-[11px] font-bold">I passed</button> : <span className="text-[11px] text-emerald-300">✓ Passed</span>}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'journal' && (
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                <div className="lg:col-span-7">
                  <div className="rounded-[24px] bg-[#121214] border border-white/[0.06] p-6">
                    <div className="flex items-center justify-between mb-5"><h2 className="text-[12px] tracking-[0.14em] font-bold text-white/30 uppercase">Journal • Reflect & Grow</h2><span className="text-[11px] text-white/30">{journals.length} entries</span></div>
                    <div className="flex gap-2 mb-4">{(['great', 'ok', 'tough'] as const).map(m => (<button key={m} onClick={() => setJournalMood(m)} className={`flex-1 h-9 rounded-full text-[11px] font-medium border capitalize transition ${journalMood === m ? 'bg-white text-black border-white' : 'bg-white/[0.04] border-white/[0.06] text-white/50 hover:text-white/80'}`}>{m}</button>))}</div>
                    <div className="flex gap-2 mb-6">
                      <input value={journalText} onChange={e => setJournalText(e.target.value)} onKeyDown={e => e.key === 'Enter' && addJournal()} placeholder="How are you feeling today?" className="flex-1 h-12 px-4 rounded-[14px] bg-white/[0.06] border border-white/[0.08] text-[13px] placeholder:text-white/30 focus:outline-none focus:border-white/20" />
                      <button onClick={addJournal} className="w-12 h-12 rounded-[14px] bg-white text-black flex items-center justify-center hover:bg-white/90"><Plus className="w-5 h-5" /></button>
                    </div>
                    <div className="space-y-3 max-h-[520px] overflow-auto pr-1">
                      {journals.map(j => (
                        <div key={j.id} className="p-4 rounded-[14px] bg-white/[0.04] border border-white/[0.06]">
                          <div className="flex items-center justify-between"><span className={`text-[10px] px-2 py-0.5 rounded-full border font-bold tracking-wide uppercase ${j.mood === 'great' ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/20' : j.mood === 'ok' ? 'bg-white/[0.06] text-white/50 border-white/[0.08]' : 'bg-amber-500/10 text-amber-300 border-amber-500/20'}`}>{j.mood}</span><span className="text-[10px] text-white/30">{new Date(j.date).toLocaleDateString()}</span></div>
                          <div className="text-[13px] leading-[1.5] text-white/70 mt-2">{j.text}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
                <div className="lg:col-span-5 space-y-6">
                  <div className="rounded-[24px] bg-[#161618] border border-white/[0.08] p-5">
                    <h3 className="text-[12px] tracking-[0.14em] font-bold text-white/30 uppercase mb-4">Why journaling works</h3>
                    <div className="space-y-3 text-[12px] leading-[1.6] text-white/50">
                      <div className="flex gap-2"><Zap className="w-4 h-4 text-emerald-300 shrink-0 mt-0.5" /> Write down what you noticed, what triggered an urge and what helped.</div>
                      <div className="flex gap-2"><Heart className="w-4 h-4 text-rose-300 shrink-0 mt-0.5" /> Look back for patterns and ideas you want to try again.</div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'rewards' && (
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                <div className="lg:col-span-7 space-y-6">
                  <div className="rounded-[28px] bg-[#131315] border border-white/[0.08] overflow-hidden relative">
                    <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/[0.08] to-amber-500/[0.06]" />
                    <div className="relative p-6 lg:p-7">
                      <div className="flex items-center justify-between mb-6">
                        <div className="flex items-center gap-3"><div className="w-8 h-8 rounded-[10px] bg-amber-500/15 border border-amber-500/20 flex items-center justify-center"><PiggyBank className="w-4 h-4 text-amber-300" /></div><div><h2 className="text-[14px] font-bold">Pledge Jar • Your Savings, Visualized</h2><div className="text-[11px] text-white/40">Fill it with what you don't smoke.</div></div></div>
                        <button onClick={() => { setShareType('money'); setShowShare(true); }} className="h-9 px-4 rounded-full bg-white text-black text-[12px] font-bold flex items-center gap-1.5"><Share2 className="w-4 h-4" /> Share</button>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-[200px_1fr] gap-6 items-end">
                        <div className="flex justify-center">
                          <div className="relative w-[160px] h-[220px] rounded-b-[28px] rounded-t-[12px] border-[3px] border-white/[0.12] bg-white/[0.03] overflow-hidden">
                            <div className="absolute top-0 left-0 right-0 h-[18px] bg-white/[0.08] border-b border-white/[0.10] flex items-center justify-center"><div className="w-10 h-1.5 rounded-full bg-white/20" /></div>
                            <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-emerald-400 to-emerald-300/80 transition-all duration-1000 flex items-end justify-center pb-2" style={{ height: `${Math.min(95, (moneySaved / (yearlyCost || 1)) * 100)}%` }}>
                              <span className="relative text-[10px] font-bold text-black/70">${moneySaved.toFixed(0)}</span>
                            </div>
                          </div>
                        </div>
                        <div className="space-y-4">
                          <div className="grid grid-cols-2 gap-3">
                            <div className="rounded-[14px] bg-[#0f0f10] border border-white/[0.06] p-3"><div className="text-[10px] uppercase tracking-widest font-bold text-white/30">Estimated spending avoided</div><div className="text-[20px] font-[900] mt-1">${moneySaved.toFixed(2)}</div></div>
                            <div className="rounded-[14px] bg-[#0f0f10] border border-white/[0.06] p-3"><div className="text-[10px] uppercase tracking-widest font-bold text-white/30">Yearly goal</div><div className="text-[20px] font-[900] mt-1">${yearlyCost.toFixed(0)}</div><div className="text-[11px] text-emerald-300">{Math.round((moneySaved / yearlyCost) * 100) || 0}% filled</div></div>
                          </div>
                          <button onClick={() => setActiveTab('dashboard')} className="w-full h-12 rounded-[14px] bg-white text-black font-bold text-[13px] flex items-center justify-center gap-2 hover:bg-white/90"><Gift className="w-4 h-4" /> Review savings estimate</button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="lg:col-span-5 space-y-6">
                  <div className="rounded-[24px] bg-gradient-to-br from-white/[0.06] to-white/[0.02] border border-white/[0.08] p-6">
                    <div className="flex items-center gap-2 mb-3"><Crown className="w-4 h-4 text-amber-300" /><h3 className="text-[13px] font-bold">Share your progress</h3></div>
                    <div className="text-[12px] leading-[1.6] text-white/50">Share your win and inspire others. 1080x1080 image with website address to www.clear-plus.app. Created on your device.</div>
                    <button onClick={() => { setShareType('money'); setShowShare(true); }} className="mt-4 w-full h-11 rounded-[12px] bg-white text-black font-bold text-[13px] flex items-center justify-center gap-2"><Share2 className="w-4 h-4" /> Generate share image</button>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'settings' && (
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                <div className="lg:col-span-7 space-y-6">
                  <div className="rounded-[24px] bg-[#121214] border border-white/[0.06] p-6">
                    <h2 className="text-[13px] font-bold mb-5 flex items-center gap-2"><Settings className="w-4 h-4" /> Settings</h2>
                    <div className="space-y-6">
                      <div>
                        <label htmlFor="quit-date" className="text-[11px] tracking-widest uppercase font-bold text-white/30 mb-2 block">Quit Date & Time</label>
                        <input id="quit-date" type="datetime-local"
                          value={quitDate && Number.isFinite(quitDate.getTime()) ? new Date(quitDate.getTime() - quitDate.getTimezoneOffset() * 60000).toISOString().slice(0, 16) : ''}
                          onChange={e => {
                            const date = e.target.value ? new Date(e.target.value) : null;
                            setQuitDate(date && Number.isFinite(date.getTime()) ? date : null);
                          }}
                          className="w-full min-w-0 h-11 px-3 rounded-[12px] bg-[#0f0f10] border border-white/[0.10] text-[13px] [color-scheme:dark]"
                        />
                      </div>
                      <div className="rounded-[16px] bg-white/[0.03] border border-white/[0.06] p-4">
                        <div className="text-[11px] font-bold tracking-widest uppercase text-white/30 mb-3">AU Cost Inputs</div>
                        <div className="grid grid-cols-2 gap-3">
                          <div><label className="text-[10px] uppercase font-bold text-white/30 mb-1.5 block">Cigs / day</label><input type="number" value={cigsPerDay} onChange={e => setCigsPerDay(Math.max(1, parseInt(e.target.value) || 1))} className="w-full h-11 px-3 rounded-[12px] bg-[#0f0f10] border border-white/[0.10] text-[13px]" /></div>
                          <div><label className="text-[10px] uppercase font-bold text-white/30 mb-1.5 block">Price / pack AUD</label><input type="number" value={costPerPack} onChange={e => setCostPerPack(Math.max(0, parseFloat(e.target.value) || 0))} className="w-full h-11 px-3 rounded-[12px] bg-[#0f0f10] border border-white/[0.10] text-[13px]" /></div>
                        </div>
                        <div className="mt-3 flex gap-1.5">{[20, 25, 30].map(s => (<button key={s} onClick={() => setPackSize(s)} className={`flex-1 h-10 rounded-[12px] text-[12px] font-bold border ${packSize === s ? 'bg-white text-black border-white' : 'bg-[#0f0f10] border-white/[0.10] text-white/60'}`}>{s} / pack</button>))}</div>
                      </div>


                    </div>
                  </div>
                </div>
                <div className="lg:col-span-5 space-y-6">
                  <div className="rounded-[24px] bg-[#131315] border border-white/[0.08] p-6">
                    <div className="flex items-center gap-2 mb-4"><Crown className="w-5 h-5 text-amber-300" /><h3 className="text-[14px] font-bold">Subscription</h3></div>
                    {isPremium ? (
                      <div className="space-y-3">
                        <p>Premium is enabled in this browser. To manage or cancel a paid subscription, use the subscription management link in your Stripe receipt.</p>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        <div className="rounded-[14px] bg-white/[0.04] border border-white/[0.06] p-4"><div className="text-[12px] font-bold">Free tier</div><div className="text-[11px] text-white/40 mt-1">Timer, basic savings, unlimited breathing, 3 craving logs/day</div></div>
                        <button onClick={() => openPaywall('Settings Upgrade')} className="w-full h-11 rounded-[12px] bg-white text-black font-bold text-[13px] flex items-center justify-center gap-2"><Crown className="w-4 h-4" /> Upgrade to clear-plus1.0 from $9.99/mo</button>
                      </div>
                    )}
                  </div>
                  <div className="rounded-[24px] bg-[#121214] border border-white/[0.06] p-5">
                    <div className="flex items-center gap-2 mb-3"><Smartphone className="w-4 h-4 text-white/60" /><h3 className="text-[12px] font-bold tracking-widest uppercase text-white/30">PWA & Install</h3></div>
                    <div className="text-[12px] leading-[1.5] text-white/50">An internet connection is required. You can save this app to your home screen where supported.</div>
                    <div className="mt-4 flex gap-2">
                      <button onClick={() => {
                        if (deferredPrompt) { const dp = deferredPrompt; dp.prompt(); dp.userChoice.then((c: any) => { if (c.outcome === 'accepted') setIsInstalled(true); setDeferredPrompt(null); }); }
                        else setShowInstallHelp(true);
                      }} className="flex-1 h-10 rounded-[10px] bg-white/[0.08] border border-white/[0.10] text-[12px] font-medium flex items-center justify-center gap-2"><Download className="w-4 h-4" /> {isInstalled ? 'Installed ✓' : 'Install App'}</button>
                      <button onClick={() => pushToast({ title: 'PWA', body: 'Add to Home Screen via browser menu.' })} className="h-10 px-3 rounded-[10px] bg-white/[0.04] border border-white/[0.06] text-[11px] text-white/50">Help</button>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </main>

          <footer className="relative z-10 border-t border-white/[0.06] mt-8 py-4 px-4 lg:px-7 flex flex-col sm:flex-row items-center justify-between gap-2 text-[11px] text-white/25">
            <div className="flex items-center gap-2"><Wind className="w-3.5 h-3.5" /> clear-plus1.0 • By a former smoker, for future non-smokers • Estimates in AUD • Quitline 13 7848 • Progress saved in this browser</div>
            <div className="flex items-center gap-3"><span className="px-2 py-1 rounded-full bg-white/[0.04] border border-white/[0.06]">{isPremium ? 'Plus • $' + (billing === 'lifetime' ? '49.95 lifetime' : billing === 'yearly' ? '29.95/y Best Value' : '9.99/mo') : 'Free tier'}</span><span>{days}d smoke-free • ${moneySaved.toFixed(0)} saved</span><button onClick={() => setActiveTab('dashboard')} className="px-2 py-1 rounded-full bg-white/[0.06] border border-white/[0.08]">Home</button></div>
          </footer>
        </>
      )}

      {showPaywall && <div className="fixed inset-0 z-[90] bg-black/60 flex items-center justify-center p-4"><section role="dialog" aria-modal="true" aria-label="clear-plus1.0 Premium" className="bg-[#fffdf8] rounded-3xl p-7 max-w-xl w-full max-h-[90vh] overflow-auto"><button className="float-right" aria-label="Close Premium" onClick={() => setShowPaywall(false)}>✕</button><h2 className="text-2xl font-bold">clear-plus1.0 Premium</h2><p className="my-4">Unlimited craving logs, savings charts and progress rewards. Your free timer, calculator and five-minute pause remain available.</p><p>{paywallFeature}</p>{(['monthly','yearly','lifetime'] as const).filter(plan => !hiddenPlanSet.has(plan)).map(plan => <button key={plan} className="block w-full border rounded-xl p-4 my-3" onClick={() => handleCheckout(plan)}>{plan === 'monthly' ? 'Monthly · AUD $9.99/month' : plan === 'yearly' ? 'Yearly · AUD $29.95/year' : 'Lifetime · AUD $49.95 once'}</button>)}{hiddenPlanSet.size > 0 && <p>Temporarily unavailable: {[...hiddenPlanSet].map(l => l === 'lifetime' ? 'Lifetime' : l === 'yearly' ? 'Yearly' : 'Monthly').join(' and ')}. Everything else works as normal.</p>}<p>Monthly and yearly plans renew automatically until cancelled. Review the final price and terms in Stripe before paying.</p><p className="mt-3">Progress is stored in this browser. Clearing browser data removes saved progress.</p></section></div>}

      {/* Share Modal */}
      {showShare && (
        <div className="fixed inset-0 z-[95] flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="absolute inset-0 bg-black/80 backdrop-blur-xl" onClick={() => setShowShare(false)} />
          <div className="relative w-full sm:max-w-[520px] rounded-t-[28px] sm:rounded-[28px] bg-[#121214] border border-white/[0.12] shadow-[0_30px_100px_rgba(0,0,0,0.9)] overflow-hidden flex flex-col max-h-[94vh]">
            <div className="p-6 overflow-auto">
              <div className="flex items-center justify-between mb-5">
                <div className="flex items-center gap-3"><div className="w-9 h-9 rounded-[12px] bg-white text-black flex items-center justify-center"><Share2 className="w-5 h-5" /></div><div><div className="text-[16px] font-bold">Share Your Win</div><div className="text-[11px] text-white/40">Preview your progress image before sharing</div></div></div>
                <button onClick={() => setShowShare(false)} className="w-9 h-9 rounded-full bg-white/[0.06] border border-white/[0.08] flex items-center justify-center"><X className="w-4 h-4" /></button>
              </div>

              <div className="flex gap-2 mb-4">
                <button onClick={() => setShareType('money')} className={`flex-1 h-10 rounded-full text-[12px] font-bold border transition ${shareType === 'money' ? 'bg-white text-black border-white' : 'bg-white/[0.06] border-white/[0.08] text-white/50'}`}>💰 ${moneySaved.toFixed(0)} Saved</button>
                <button onClick={() => setShareType('days')} className={`flex-1 h-10 rounded-full text-[12px] font-bold border transition ${shareType === 'days' ? 'bg-white text-black border-white' : 'bg-white/[0.06] border-white/[0.08] text-white/50'}`}>📅 {days} Days Free</button>
              </div>

              <div className="rounded-[20px] bg-[#0f0f10] border border-white/[0.08] p-3 flex justify-center overflow-hidden">
                <canvas ref={canvasRef} className="w-full max-w-[360px] aspect-square rounded-[16px] bg-[#0A0A0B] border border-white/[0.06]" width={1080} height={1080} />
              </div>

              <div className="mt-5 grid grid-cols-2 gap-2">
                <button onClick={() => {
                  const c = canvasRef.current; if (!c) return;
                  const url = c.toDataURL('image/png');
                  const a = document.createElement('a'); a.href = url; a.download = `clear-win-${shareType}-${days}d.png`; a.click();
                  pushToast({ title: 'Image downloaded', body: '1080x1080 PNG saved. Share it!' });
                }} className="h-12 rounded-[12px] bg-white text-black font-bold text-[13px] flex items-center justify-center gap-2"><Download className="w-4 h-4" /> Download PNG</button>
                <button onClick={async () => {
                  const c = canvasRef.current; if (!c) return;
                  try {
                    const blob = await new Promise<Blob | null>(res => c.toBlob(res, 'image/png'));
                    if (!blob) return;
                    const file = new File([blob], 'clear-win.png', { type: 'image/png' });
                    // @ts-ignore
                    if (navigator.canShare && navigator.canShare({ files: [file] })) {
                      // @ts-ignore
                      await navigator.share({ files: [file], title: 'I quit with clear-plus1.0', text: `My estimated spending avoided is $${moneySaved.toFixed(0)} and quit for ${days} days with clear-plus1.0!` });
                    } else if (navigator.share) {
                      // @ts-ignore
                      await navigator.share({ title: 'I quit with clear-plus1.0', text: `My estimated spending avoided is $${moneySaved.toFixed(0)} and quit for ${days} days with clear-plus1.0! www.clear-plus.app` });
                    } else {
                      const url = URL.createObjectURL(blob);
                      window.open(url, '_blank');
                      pushToast({ title: 'Share API not supported', body: 'Image opened in a new tab. Save it before uploading.' });
                    }
                  } catch (e) {
                    pushToast({ title: 'Share failed', body: 'Download the image and share manually.' });
                  }
                }} className="h-12 rounded-[12px] bg-white/[0.08] border border-white/[0.10] font-bold text-[13px] flex items-center justify-center gap-2"><Share2 className="w-4 h-4" /> System Share</button>
              </div>

              <div className="mt-3 grid grid-cols-2 gap-2">
                <button onClick={() => {
                  const text = `My estimated spending avoided is $${moneySaved.toFixed(0)} and quit for ${days} days with clear-plus1.0! www.clear-plus.app`;
                  const url = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent('https://www.clear-plus.app')}&quote=${encodeURIComponent(text)}`;
                  window.open(url, '_blank');
                }} className="h-10 rounded-[10px] bg-[#1877F2]/15 border border-[#1877F2]/20 text-[#8AB4FF] text-[12px] font-semibold flex items-center justify-center gap-2"><Facebook className="w-4 h-4" /> Facebook</button>
                <button onClick={() => {
                  pushToast({ title: 'Instagram', body: 'Download PNG, then upload to Instagram Story/Post. Include the website address: www.clear-plus.app' });
                }} className="h-10 rounded-[10px] bg-gradient-to-br from-[#FEDA75]/15 via-[#FA7E1E]/15 to-[#D62976]/15 border border-white/[0.08] text-white/80 text-[12px] font-semibold flex items-center justify-center gap-2"><Instagram className="w-4 h-4" /> Instagram</button>
              </div>

              <div className="mt-4 rounded-[12px] bg-emerald-500/10 border border-emerald-500/20 p-3 text-[11px] leading-[1.4] text-emerald-200/70 flex gap-2">
                <QrCode className="w-4 h-4 text-emerald-300 shrink-0 mt-0.5" />
                <div><span className="font-bold text-emerald-200">Your choice:</span> Review your image before sharing. It includes your quit date and personal progress estimates.</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* SOS Fullscreen */}
      {showSOSFull && activeTab !== 'sos' && mode === 'app' && (
        <div className="fixed inset-0 z-[60] flex flex-col bg-[#08080a]">
          <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/[0.15] via-violet-500/[0.08] to-sky-500/[0.10]" />
          <div className="relative z-10 flex items-center justify-between p-6"><div className="flex items-center gap-3"><div className="w-9 h-9 rounded-full bg-white text-black flex items-center justify-center"><Wind className="w-5 h-5" /></div><div><div className="text-[13px] font-bold">Breathing exercise</div><div className="text-[11px] text-white/40">4-7-8 • Craving will pass</div></div></div><button onClick={() => { setShowSOSFull(false); setBreathRunning(false); }} className="w-10 h-10 rounded-full bg-white/[0.08] border border-white/[0.10] flex items-center justify-center"><X className="w-5 h-5" /></button></div>
          <div className="relative z-10 flex-1 flex flex-col items-center justify-center p-8 text-center">
            <div className="mb-8"><div className="text-[11px] tracking-[0.2em] uppercase font-bold text-white/30">Round {breathCount + 1} • {breathPhase}</div><div className="mt-2 text-[28px] font-[800] capitalize">{breathPhase === 'inhale' ? 'Breathe in slowly' : breathPhase === 'hold' ? 'Hold' : breathPhase === 'exhale' ? 'Breathe out fully' : 'Rest'}</div></div>
            <div className="relative w-[260px] h-[260px] flex items-center justify-center"><div className={`absolute rounded-full border border-white/10 transition-all duration-[1000ms] ${breathPhase === 'inhale' ? 'w-[240px] h-[240px] bg-white/[0.06]' : breathPhase === 'hold' ? 'w-[240px] h-[240px] bg-white/[0.08]' : breathPhase === 'exhale' ? 'w-[120px] h-[120px] bg-white/[0.03]' : 'w-[160px] h-[160px] bg-white/[0.04]'}`} /><div className={`absolute rounded-full bg-gradient-to-br from-emerald-400 to-teal-400 shadow-[0_0_60px_rgba(16,185,129,0.5)] transition-all ease-in-out ${breathPhase === 'inhale' ? 'w-[200px] h-[200px] duration-[4000ms]' : breathPhase === 'hold' ? 'w-[200px] h-[200px] duration-[7000ms]' : breathPhase === 'exhale' ? 'w-[90px] h-[90px] duration-[8000ms]' : 'w-[130px] h-[130px] duration-[1000ms]'}`} /><div className="relative z-10 text-center"><div className="text-[42px] font-[900] tabular-nums">{breathPhase === 'inhale' ? '4s' : breathPhase === 'hold' ? '7s' : breathPhase === 'exhale' ? '8s' : '•'}</div><div className="text-[11px] tracking-widest uppercase text-white/50 font-bold mt-1">{breathPhase}</div></div></div>
            <div className="mt-10 flex items-center gap-3"><button onClick={() => setBreathRunning(!breathRunning)} className="h-12 px-6 rounded-full bg-white text-black font-bold text-[13px] flex items-center gap-2"><Play className="w-4 h-4" />{breathRunning ? 'Pause' : 'Start'}</button><button onClick={() => { setBreathCount(0); setBreathPhase('inhale'); }} className="h-12 w-12 rounded-full bg-white/[0.08] border border-white/[0.10] flex items-center justify-center"><RotateCcw className="w-4 h-4" /></button></div>
          </div>
          <div className="relative z-10 p-6 flex gap-3"><button onClick={() => { const id = cravings.find(c => !c.passed)?.id; if (id) markCravingPassed(id); setShowSOSFull(false); setBreathRunning(false); }} className="flex-1 h-12 rounded-full bg-emerald-500 text-black font-bold text-[13px] flex items-center justify-center gap-2"><Sparkles className="w-4 h-4" /> I beat the craving</button><button onClick={() => { setShowSOSFull(false); setBreathRunning(false); }} className="h-12 px-6 rounded-full bg-white/[0.08] border border-white/[0.10] text-[13px]">Close</button></div>
        </div>
      )}

      {/* Craving form */}
      {showCravingForm && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="absolute inset-0 bg-black/70 backdrop-blur-xl" onClick={() => setShowCravingForm(false)} />
          <div className="relative w-full sm:max-w-[400px] rounded-t-[24px] sm:rounded-[24px] bg-[#161618] border border-white/[0.10] p-6">
            <div className="flex items-center justify-between mb-5"><h3 className="font-bold">Log craving</h3><button onClick={() => setShowCravingForm(false)} className="w-8 h-8 rounded-full bg-white/[0.06] flex items-center justify-center"><X className="w-4 h-4" /></button></div>
            <div className="space-y-4">
              <div><label className="text-[11px] uppercase tracking-widest font-bold text-white/30 mb-2 block">Intensity {cravingIntensity}/10</label><input type="range" min={1} max={10} value={cravingIntensity} onChange={e => setCravingIntensity(parseInt(e.target.value))} className="w-full accent-white" /></div>
              <div><label className="text-[11px] uppercase tracking-widest font-bold text-white/30 mb-2 block">Trigger</label><div className="grid grid-cols-3 gap-2">{['Stress', 'Coffee', 'After meal', 'Boredom', 'Social', 'Driving'].map(t => (<button key={t} onClick={() => setCravingTrigger(t)} className={`h-9 rounded-full text-[11px] font-medium border transition ${cravingTrigger === t ? 'bg-white text-black border-white' : 'bg-white/[0.05] border-white/[0.08] text-white/60'}`}>{t}</button>))}</div></div>
              <div><label className="text-[11px] uppercase tracking-widest font-bold text-white/30 mb-2 block">Note (optional)</label><input value={cravingNote} onChange={e => setCravingNote(e.target.value)} placeholder="What helped?" className="w-full h-11 px-4 rounded-[12px] bg-white/[0.06] border border-white/[0.10] text-[13px] placeholder:text-white/30 focus:outline-none" /></div>
              <button onClick={addCraving} className="w-full h-12 rounded-[14px] bg-white text-black font-bold text-[13px] flex items-center justify-center gap-2"><Wind className="w-4 h-4" /> Save craving</button>
            </div>
          </div>
        </div>
      )}

      {showInstallHelp && (
        <div className="fixed inset-0 z-[70] flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="absolute inset-0 bg-black/80 backdrop-blur-xl" onClick={() => setShowInstallHelp(false)} />
          <div className="relative w-full sm:max-w-[420px] rounded-t-[24px] sm:rounded-[24px] bg-[#161618] border border-white/[0.10] p-6">
            <div className="flex items-center justify-between mb-5"><h3 className="font-bold flex items-center gap-2"><Download className="w-4 h-4" /> Install clear-plus1.0</h3><button onClick={() => setShowInstallHelp(false)} className="w-8 h-8 rounded-full bg-white/[0.06] flex items-center justify-center"><X className="w-4 h-4" /></button></div>
            <div className="space-y-4 text-[13px] leading-[1.6] text-white/70">
              <div className="rounded-[14px] bg-white/[0.04] border border-white/[0.06] p-4"><div className="font-bold text-white mb-2">How to install:</div><ul className="space-y-2 text-[12px]"><li><span className="text-white font-medium">Chrome / Edge:</span> Address bar → Install icon or Menu → Install app.</li><li><span className="text-white font-medium">Android:</span> ⋮ → Add to Home screen.</li><li><span className="text-white font-medium">iOS Safari:</span> Share → Add to Home Screen.</li></ul></div>
              <button onClick={() => setShowInstallHelp(false)} className="w-full h-11 rounded-[12px] bg-white text-black font-bold">Got it</button>
            </div>
          </div>
        </div>
      )}

       <Analytics />
       <style>{`@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap'); *{font-family: Inter, ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial}`}</style>
    </div>
  );
}
