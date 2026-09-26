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
type Tab = 'dashboard' | 'sos' | 'journal' | 'rewards' | 'settings';
type Mode = 'landing' | 'app';
type ShareType = 'money' | 'days';

const HEALTH_MILESTONES = [
  { mins: 20, title: 'Heart rate normalizes', desc: 'Heart rate and blood pressure drop to normal.', icon: Heart },
  { mins: 720, title: 'Carbon monoxide clears', desc: 'CO level drops, oxygen rises.', icon: Droplets },
  { mins: 1440, title: 'Nicotine leaves body', desc: 'Nicotine is mostly out. Cravings peak but fade.', icon: Brain },
  { mins: 2880, title: 'Taste & smell improve', desc: 'Nerve endings regrow. Food tastes better.', icon: Leaf },
  { mins: 4320, title: 'Circulation improves', desc: 'Blood flow improves. Walking easier.', icon: Activity },
  { mins: 10080, title: 'Lungs begin to clear', desc: 'Cilia regrow. Less coughing.', icon: Wind },
  { mins: 43200, title: 'Heart risk halves', desc: 'Coronary risk half that of a smoker.', icon: ShieldCheck },
];

const QUOTES = [
  "Every craving lasts 3-5 minutes. You've beaten hundreds already.",
  "You're not giving something up. You're getting your life back.",
  "The lungs you save are your own.",
  "One day at a time. One craving at a time.",
];

const TESTIMONIALS = [
  { name: 'Sarah M., Brisbane', text: 'Saved $14,600 and my lungs. Clear+ kept me honest with the jar. No lectures, just numbers.', saved: '$14,600', days: 187 },
  { name: 'James L., Newcastle', text: 'The breathing SOS saved me at 2am at the servo. Worth every cent of premium. 6 months clean.', saved: '$8,200', days: 183 },
  { name: 'Priya K., Parramatta', text: 'My kid said I smell better. Best $4.99/mo I ever spent. The share image made my family proud.', saved: '$21,900', days: 342 },
];

export default function App() {
  // === MODE ===
  // === MODE ===
  const [mode, setMode] = useState<Mode>('app');

  // === CORE STATE ===
  const [quitDate, setQuitDate] = useState<Date>(() => {
    try { const s = localStorage.getItem('clear_quitDate'); if (s) return new Date(s); } catch {}
    const d = new Date(); d.setDate(d.getDate() - 3); d.setHours(d.getHours() - 5); return d;
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
  const [isPremium, setIsPremium] = useState(() => {
    try { return localStorage.getItem('clear_isPremium') === 'true'; } catch { return false; }
  });
  const [activeTab, setActiveTab] = useState<Tab>('dashboard');
  const [showPaywall, setShowPaywall] = useState(false);
  const [paywallFeature, setPaywallFeature] = useState('Premium Analytics');
  const [billing, setBilling] = useState<'monthly' | 'yearly' | 'lifetime'>('yearly');
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
  const [sosUses, setSosUses] = useState(() => {
    try { const raw = localStorage.getItem('clear_sosUses'); if (raw) { const o = JSON.parse(raw); if (o.date === new Date().toDateString()) return o.count; } } catch {}
    return 0;
  });
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [founderPhoto, setFounderPhoto] = useState<string | null>(null);
  const [showSuccessCelebration, setShowSuccessCelebration] = useState(false);
  const [globalSavedCounter, setGlobalSavedCounter] = useState(2418329);
  const [utm, setUtm] = useState<Record<string, string>>({});
  const [referral, setReferral] = useState<string>('');

  // Founder counter logic - persisted, demo starts at 13 sold
  const [founderSold, setFounderSold] = useState(() => {
    try {
      const v = localStorage.getItem('clear_founder_sold');
      if (v) {
        const n = parseInt(v, 10);
        if (!isNaN(n) && n >= 0 && n <= 100) return n;
      }
    } catch {}
    return 13;
  });

  // FINAL STRIPE PRICING - prod_VH8JKn97ec1n57
  // Monthly: price_1UGa3KRsZqvWlIOHvkRsX1TM = $9.99/mo recurring, lookup standard_monthly
  // Yearly: price_1UGawQRsZqvWlIOHGpXi1NJl = $29.95/yr recurring, lookup yearly_29_95
  // Lifetime Founder: price_1UGac6RsZqvWlIOHbwlEO7Yv = $49.95 one-time, lookup lifetime_founder_100
  const STRIPE_MONTHLY_PRICE_ID = 'price_1UGa3KRsZqvWlIOHvkRsX1TM';
  const STRIPE_YEARLY_PRICE_ID = 'price_1UGawQRsZqvWlIOHGpXi1NJl';
  const STRIPE_LIFETIME_PRICE_ID = 'price_1UGac6RsZqvWlIOHbwlEO7Yv';

  const [stripePublishable, setStripePublishable] = useState(() => {
    try { return localStorage.getItem('clear_stripe_pk') || ''; } catch { return ''; }
  });
  const [stripeMonthlyId, setStripeMonthlyId] = useState(() => {
    try { return localStorage.getItem('clear_stripe_monthly') || 'price_1UGa3KRsZqvWlIOHvkRsX1TM'; } catch { return 'price_1UGa3KRsZqvWlIOHvkRsX1TM'; }
  });
  const [stripeYearlyId, setStripeYearlyId] = useState(() => {
    try { return localStorage.getItem('clear_stripe_yearly') || 'price_1UGawQRsZqvWlIOHGpXi1NJl'; } catch { return 'price_1UGawQRsZqvWlIOHGpXi1NJl'; }
  });
  const [stripeLifetimeId, setStripeLifetimeId] = useState(() => {
    try { return localStorage.getItem('clear_stripe_lifetime') || 'price_1UGac6RsZqvWlIOHbwlEO7Yv'; } catch { return 'price_1UGac6RsZqvWlIOHbwlEO7Yv'; }
  });

  // Share modal
  const [showShare, setShowShare] = useState(false);
  const [shareType, setShareType] = useState<ShareType>('money');
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const [cravings, setCravings] = useState<Craving[]>([
    { id: '1', time: new Date(Date.now() - 1000 * 60 * 60 * 5), intensity: 8, trigger: 'Coffee break', passed: true, note: 'Went for walk' },
    { id: '2', time: new Date(Date.now() - 1000 * 60 * 60 * 26), intensity: 5, trigger: 'Stress', passed: true },
    { id: '3', time: new Date(Date.now() - 1000 * 60 * 60 * 50), intensity: 7, trigger: 'After meal', passed: true },
    { id: '4', time: new Date(Date.now() - 1000 * 60 * 60 * 72), intensity: 9, trigger: 'Social', passed: false },
  ]);
  const [journals, setJournals] = useState<JournalEntry[]>([
    { id: '1', date: new Date(Date.now() - 1000 * 60 * 60 * 20), mood: 'great', text: 'Day 2 – slept better than in months. Morning coffee without cigarette felt weird but good.' },
    { id: '2', date: new Date(Date.now() - 1000 * 60 * 60 * 44), mood: 'tough', text: 'Craving hit hard after dinner. Used breathing exercise. It passed in 4 minutes.' },
    { id: '3', date: new Date(Date.now() - 1000 * 60 * 60 * 80), mood: 'ok', text: 'Saved $120 already. Jar is filling. Thinking about Bali flights.' },
  ]);

  // === EFFECTS ===
  useEffect(() => { const id = setInterval(() => setNow(new Date()), 1000); return () => clearInterval(id); }, []);
  useEffect(() => {
    const id = setInterval(() => setGlobalSavedCounter(c => c + Math.floor(Math.random() * 7) + 2), 3200);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem('clear_quitDate', quitDate.toISOString());
      localStorage.setItem('clear_cigsPerDay', String(cigsPerDay));
      localStorage.setItem('clear_costPerPack', String(costPerPack));
      localStorage.setItem('clear_packSize', String(packSize));
      localStorage.setItem('clear_isPremium', String(isPremium));
      localStorage.setItem('clear_sosUses', JSON.stringify({ date: new Date().toDateString(), count: sosUses }));
      localStorage.setItem('clear_mode', mode);
      localStorage.setItem('clear_stripe_pk', stripePublishable);
      localStorage.setItem('clear_stripe_monthly', stripeMonthlyId);
      localStorage.setItem('clear_stripe_yearly', stripeYearlyId);
      localStorage.setItem('clear_stripe_lifetime', stripeLifetimeId);
      if (referral) localStorage.setItem('clear_referral', referral);
      localStorage.setItem('clear_founder_sold', String(founderSold));
    } catch {}
  }, [quitDate, cigsPerDay, costPerPack, packSize, isPremium, sosUses, mode, stripePublishable, stripeMonthlyId, stripeYearlyId, stripeLifetimeId, referral, founderSold]);

  useEffect(() => {
    try {
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
      if (p.get('success') === 'true') {
        setIsPremium(true);
        setMode('app');
        setShowSuccessCelebration(true);
        setTimeout(() => setShowSuccessCelebration(false), 6000);
        // clean url
        window.history.replaceState({}, '', window.location.pathname + '?app=1');
      }
      const fp = localStorage.getItem('clear_founder_photo'); if (fp) setFounderPhoto(fp);
    } catch {}
  }, []);

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

  const pushToast = (t: Omit<Toast, 'id'>) => { const id = Date.now().toString() + Math.random().toString(16).slice(2); setToasts(p => [...p.slice(-3), { ...t, id }]); setTimeout(() => setToasts(p => p.filter(x => x.id !== id)), 4000); };
  const openPaywall = (feature: string) => { setPaywallFeature(feature); setShowPaywall(true); };

  // === CALCS ===
  const diffMs = Math.max(0, now.getTime() - quitDate.getTime());
  const totalMins = Math.floor(diffMs / 60000);
  const days = Math.floor(totalMins / 1440);
  const hours = Math.floor((totalMins % 1440) / 60);
  const mins = totalMins % 60;
  const secs = Math.floor((diffMs % 60000) / 1000);
  const cigsAvoided = Math.floor((totalMins / 1440) * cigsPerDay + ((totalMins % 1440) / 1440) * cigsPerDay);
  const pricePerCig = packSize > 0 ? costPerPack / packSize : 0;
  const moneySaved = cigsAvoided * pricePerCig;
  const dailyCost = cigsPerDay * pricePerCig;
  const yearlyCost = dailyCost * 365;
  const monthlyCost = dailyCost * 30;
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

  const addCraving = () => {
    if (!isPremium && sosUses >= 3) { openPaywall('Unlimited SOS & Craving Log'); return; }
    const c: Craving = { id: Date.now().toString(), time: new Date(), intensity: cravingIntensity, trigger: cravingTrigger, passed: false, note: cravingNote.trim() || undefined };
    setCravings([c, ...cravings]); setShowCravingForm(false); setCravingNote(''); setShowSOSFull(true); setBreathRunning(true); setBreathPhase('inhale'); setSosUses(s => s + 1);
  };
  const markCravingPassed = (id: string) => setCravings(cravings.map(c => c.id === id ? { ...c, passed: true } : c));
  const addJournal = () => { if (!journalText.trim()) return; setJournals([{ id: Date.now().toString(), date: new Date(), mood: journalMood, text: journalText.trim() }, ...journals]); setJournalText(''); pushToast({ title: 'Journal saved', body: 'Your entry is stored locally. Keep going!' }); };

  const handleCheckout = async (plan: 'monthly' | 'yearly' | 'lifetime') => {
    if (plan === 'lifetime' && isFounderSoldOut) {
      pushToast({ title: 'Founder sold out', body: 'All 100 Founder Lifetime spots claimed. Choose Yearly — Best Value.' });
      return;
    }
    let priceId: string;
    if (plan === 'monthly') priceId = stripeMonthlyId;
    else if (plan === 'yearly') priceId = stripeYearlyId;
    else priceId = stripeLifetimeId;
    
    const isRealId = priceId.startsWith('price_') && !priceId.includes('PLACEHOLDER');
    if (!isRealId) {
      // Mock mode
      setIsPremium(true); setShowPaywall(false);
      if (plan === 'lifetime') {
        setFounderSold(s => Math.min(100, s + 1));
        pushToast({ title: 'Welcome Founder Lifetime 🎉', body: 'Lifetime $49.95 activated (mock).' });
      } else pushToast({ title: 'Welcome to Clear+ 🎉', body: plan === 'yearly' ? 'Yearly $29.95 activated (mock).' : 'Monthly $9.99 activated (mock).' });
      return;
    }

    try {
      pushToast({ title: 'Creating secure checkout...', body: `Price ${priceId} — redirecting to Stripe` });
      const res = await fetch('/api/create-checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          priceId, 
          billing: plan,
          successUrl: window.location.origin + '/?success=true&billing=' + plan + '&app=1',
          cancelUrl: window.location.origin + '/?canceled=true&app=1'
        })
      });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        throw new Error(data.error || 'No checkout URL returned');
      }
    } catch (e: any) {
      console.error(e);
      pushToast({ title: 'Checkout error', body: e.message + ' — Check Vercel env STRIPE_SECRET_KEY is set.' });
      // Fallback mock success so you can test
      setTimeout(() => {
        setIsPremium(true); setShowPaywall(false);
        pushToast({ title: 'Mock activated (fallback)', body: 'Set STRIPE_SECRET_KEY in Vercel to enable real payments.' });
      }, 1000);
    }
  };

  const navItems: Array<{ id: Tab; label: string; icon: any; free?: boolean }> = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, free: true },
    { id: 'sos', label: 'SOS', icon: LifeBuoy, free: true },
    { id: 'journal', label: 'Journal', icon: NotebookPen, free: true },
    { id: 'rewards', label: 'Rewards', icon: Trophy, free: false },
    { id: 'settings', label: 'Settings', icon: Settings, free: true },
  ];

  const baliFlights = Math.floor(yearlyCost / 900);
  const milkCartons = Math.floor(yearlyCost / 4.5);
  const founderRemaining = Math.max(0, 100 - founderSold);
  const isFounderSoldOut = founderRemaining <= 0;

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
    ctx.fillStyle = 'white'; ctx.font = '900 36px Inter, sans-serif'; ctx.fillText('Clear', 64, 88);
    ctx.fillStyle = 'rgba(255,255,255,0.9)'; ctx.font = '800 22px Inter, sans-serif'; ctx.fillText('+', 168, 84);
    ctx.fillStyle = 'rgba(255,255,255,0.35)'; ctx.font = '600 14px Inter, sans-serif'; ctx.fillText('BY A FORMER SMOKER, FOR FUTURE NON-SMOKERS', 64, 120);
    // pill
    ctx.fillStyle = 'rgba(16,185,129,0.12)'; ctx.strokeStyle = 'rgba(16,185,129,0.25)'; ctx.lineWidth = 1;
    // @ts-ignore roundRect
    if (ctx.roundRect) { ctx.beginPath(); ctx.roundRect(W - 280, 48, 216, 36, 18); ctx.fill(); ctx.stroke(); } else { ctx.fillRect(W - 280, 48, 216, 36); }
    ctx.fillStyle = '#6EE7B7'; ctx.font = '700 13px Inter'; ctx.fillText('● LIVE • QUIT VERIFIED', W - 264, 70);
    // main number
    const mainText = shareType === 'money' ? `$${moneySaved.toFixed(0)}` : `${days} DAYS`;
    const subText = shareType === 'money' ? 'Saved' : 'Smoke-Free';
    ctx.fillStyle = 'white'; ctx.font = '900 168px Inter, sans-serif'; ctx.fillText(mainText, 64, 420);
    ctx.fillStyle = 'rgba(255,255,255,0.55)'; ctx.font = '700 64px Inter'; ctx.fillText(subText, 64, 500);
    // stats row
    ctx.fillStyle = 'rgba(255,255,255,0.06)'; ctx.strokeStyle = 'rgba(255,255,255,0.08)';
    // @ts-ignore
    if (ctx.roundRect) { ctx.beginPath(); ctx.roundRect(64, 560, 952, 140, 24); ctx.fill(); ctx.stroke(); }
    else ctx.fillRect(64, 560, 952, 140);
    ctx.fillStyle = 'rgba(255,255,255,0.35)'; ctx.font = '600 14px Inter'; ctx.fillText('CIGS AVOIDED', 96, 600);
    ctx.fillStyle = 'white'; ctx.font = '800 28px Inter'; ctx.fillText(`${cigsAvoided}`, 96, 640);
    ctx.fillStyle = 'rgba(255,255,255,0.35)'; ctx.font = '600 14px Inter'; ctx.fillText('LIFE REGAINED', 320, 600);
    ctx.fillStyle = 'white'; ctx.font = '800 28px Inter'; ctx.fillText(`${lifeSavedHours}h`, 320, 640);
    ctx.fillStyle = 'rgba(255,255,255,0.35)'; ctx.font = '600 14px Inter'; ctx.fillText('CRAVINGS BEATEN', 560, 600);
    ctx.fillStyle = '#6EE7B7'; ctx.font = '800 28px Inter'; ctx.fillText(`${cravingsPassed}`, 560, 640);
    ctx.fillStyle = 'rgba(255,255,255,0.35)'; ctx.font = '600 14px Inter'; ctx.fillText('STARTED', 800, 600);
    ctx.fillStyle = 'white'; ctx.font = '700 18px Inter'; ctx.fillText(quitDate.toLocaleDateString('en-AU'), 800, 640);
    // quote
    ctx.fillStyle = 'rgba(255,255,255,0.75)'; ctx.font = 'italic 500 22px Inter'; ctx.fillText(`"${QUOTES[days % QUOTES.length]}"`, 64, 780);
    // QR placeholder + footer
    ctx.fillStyle = 'white'; // @ts-ignore
    if (ctx.roundRect) { ctx.beginPath(); ctx.roundRect(64, 860, 140, 140, 16); ctx.fill(); } else ctx.fillRect(64, 860, 140, 140);
    // fake qr
    ctx.fillStyle = 'black';
    for (let y = 0; y < 7; y++) for (let x = 0; x < 7; x++) if ((x + y) % 2 === 0 || Math.random() > 0.5) ctx.fillRect(84 + x * 16, 880 + y * 16, 12, 12);
    // footer text
    ctx.fillStyle = 'rgba(255,255,255,0.9)'; ctx.font = '700 18px Inter'; ctx.fillText('I quit with Clear+', 240, 920);
    ctx.fillStyle = 'rgba(255,255,255,0.45)'; ctx.font = '500 15px Inter'; ctx.fillText('clearplus.app • Built in regional QLD • Quitline 13 7848', 240, 948);
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
    <div className="min-h-screen bg-[#070708] text-white selection:bg-white/20 flex flex-col relative overflow-x-hidden">
      {/* global bg */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute -top-[20%] left-[10%] w-[60%] h-[50%] rounded-full blur-[150px] opacity-[0.14] bg-emerald-500" />
        <div className="absolute -bottom-[20%] right-[5%] w-[55%] h-[45%] rounded-full blur-[140px] opacity-[0.10] bg-violet-500" />
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.012)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.012)_1px,transparent_1px)] bg-[size:44px_44px]" />
      </div>

      {/* Celebration */}
      {showSuccessCelebration && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 pointer-events-none">
          <div className="pointer-events-auto rounded-[28px] bg-[#121214] border border-emerald-500/30 p-8 text-center shadow-[0_30px_100px_rgba(0,0,0,0.9)] max-w-[420px] w-full">
            <div className="w-16 h-16 rounded-full bg-emerald-500 text-black flex items-center justify-center mx-auto mb-4"><Crown className="w-8 h-8" /></div>
            <div className="text-[22px] font-[900]">You're now Clear+ 🎉</div>
            <div className="text-[13px] text-white/60 mt-2 leading-[1.5]">Premium unlocked. Unlimited SOS, analytics, 0% jar fee. Thanks for supporting free quitters.</div>
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

      {/* ===== LANDING MODE ===== */}
      {mode === 'landing' && (
        <>
          {/* Landing Header */}
          <header className="sticky top-0 z-40 h-[68px] flex items-center justify-between px-4 lg:px-7 border-b border-white/[0.06] bg-[#0A0A0B]/80 backdrop-blur-2xl">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-[12px] bg-white text-black flex items-center justify-center font-bold shadow-[0_0_20px_rgba(255,255,255,0.15)]"><Wind className="w-5 h-5" /></div>
              <div className="flex items-center gap-2">
                <span className="font-[800] tracking-[-0.03em] text-[18px] leading-none">Clear</span>
                <span className="text-[10px] tracking-[0.16em] font-bold px-2 py-0.5 rounded-full bg-white text-black">+</span>
              </div>
              <div className="hidden lg:flex items-center gap-1 ml-6 p-1 rounded-full bg-white/[0.04] border border-white/[0.06]">
                <button onClick={() => scrollTo('how')} className="h-7 px-3 rounded-full text-[12px] text-white/60 hover:text-white hover:bg-white/[0.06]">How it Works</button>
                <button onClick={() => scrollTo('pricing')} className="h-7 px-3 rounded-full text-[12px] text-white/60 hover:text-white hover:bg-white/[0.06]">Pricing</button>
                <button onClick={() => scrollTo('founder')} className="h-7 px-3 rounded-full text-[12px] text-white/60 hover:text-white hover:bg-white/[0.06]">Founder Story</button>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <div className="hidden sm:flex items-center gap-2 px-3 h-8 rounded-full bg-emerald-500/10 border border-emerald-500/20">
                <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" /><span className="text-[11px] text-emerald-300 font-bold">${(globalSavedCounter / 1000000).toFixed(1)}M saved live</span>
              </div>
              <button onClick={() => enterApp('landing_header')} className="h-9 px-4 rounded-full bg-white text-black text-[12px] font-bold flex items-center gap-1.5 hover:bg-white/90 shadow-[0_4px_20px_rgba(255,255,255,0.15)]">
                <Rocket className="w-4 h-4" /> Open App
              </button>
              <button onClick={() => setMobileNavOpen(!mobileNavOpen)} className="lg:hidden w-9 h-9 rounded-full bg-white/[0.06] border border-white/[0.08] flex items-center justify-center"><Menu className="w-4 h-4" /></button>
            </div>
          </header>
          {mobileNavOpen && (
            <div className="lg:hidden relative z-30 bg-[#0e0e10] border-b border-white/[0.06] px-4 py-3 flex gap-2 overflow-x-auto">
              <button onClick={() => scrollTo('how')} className="shrink-0 h-9 px-4 rounded-full text-[13px] bg-white/[0.06] border border-white/[0.08] text-white/70">How it Works</button>
              <button onClick={() => scrollTo('pricing')} className="shrink-0 h-9 px-4 rounded-full text-[13px] bg-white/[0.06] border border-white/[0.08] text-white/70">Pricing</button>
              <button onClick={() => scrollTo('founder')} className="shrink-0 h-9 px-4 rounded-full text-[13px] bg-white/[0.06] border border-white/[0.08] text-white/70">Founder</button>
              <button onClick={() => enterApp('mobile')} className="shrink-0 h-9 px-4 rounded-full text-[13px] bg-white text-black font-bold">Open App</button>
            </div>
          )}

          <main className="relative z-10 w-full">
            {/* HERO */}
            <section className="max-w-[1280px] mx-auto px-4 lg:px-7 pt-12 lg:pt-20 pb-16 grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
              <div className="lg:col-span-7">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/[0.06] border border-white/[0.08] text-[11px] tracking-wide text-white/60">
                  <BadgeCheck className="w-3.5 h-3.5 text-emerald-300" /> Built in regional QLD • No ads • No guilt • Just results
                  {referral && <span className="ml-2 px-2 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-500/20 text-emerald-300">ref: {referral}</span>}
                </div>
                <h1 className="mt-6 text-[40px] lg:text-[64px] font-[900] tracking-[-0.04em] leading-[0.95]">Quit Smoking.<br /><span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-300 to-teal-200">Keep The Money.</span><br />Feel Amazing.</h1>
                <p className="mt-5 text-[16px] lg:text-[18px] leading-[1.6] text-white/55 max-w-[560px]">Built by an ex-smoker from regional QLD. No ads. No guilt. Just results. Timer, SOS breathing, AU cost calculator ($50/25pk), savings jar, and viral wins.</p>

                <div className="mt-8 flex flex-wrap gap-3">
                  <button onClick={() => enterApp('hero_primary')} className="h-[52px] px-7 rounded-full bg-white text-black font-[800] text-[14px] flex items-center gap-2 hover:bg-white/90 shadow-[0_10px_30px_rgba(255,255,255,0.18)]">
                    <Rocket className="w-5 h-5" /> Start Quitting Free <ArrowRight className="w-4 h-4" />
                  </button>
                  <button onClick={() => scrollTo('how')} className="h-[52px] px-6 rounded-full bg-white/[0.06] border border-white/[0.10] text-[14px] font-semibold flex items-center gap-2">
                    <Eye className="w-4 h-4" /> See how it works
                  </button>
                </div>

                <div className="mt-8 grid grid-cols-1 sm:grid-cols-3 gap-3 max-w-[560px]">
                  <div className="rounded-[16px] bg-[#121214] border border-white/[0.06] p-4">
                    <div className="text-[11px] uppercase tracking-widest font-bold text-white/30">Live Counter</div>
                    <div className="mt-1 text-[20px] font-[900] text-emerald-300 tabular-nums">${globalSavedCounter.toLocaleString('en-AU')}</div>
                    <div className="text-[11px] text-white/40">Australians saved with Clear</div>
                  </div>
                  <div className="rounded-[16px] bg-[#121214] border border-white/[0.06] p-4">
                    <div className="text-[11px] uppercase tracking-widest font-bold text-white/30">Avg saved / year</div>
                    <div className="mt-1 text-[20px] font-[900]">$14,600</div>
                    <div className="text-[11px] text-white/40">20/day • $50/25-pack</div>
                  </div>
                  <div className="rounded-[16px] bg-[#121214] border border-white/[0.06] p-4">
                    <div className="text-[11px] uppercase tracking-widest font-bold text-white/30">Quitline</div>
                    <div className="mt-1 text-[16px] font-bold flex items-center gap-1.5"><Phone className="w-4 h-4" /> 13 7848</div>
                    <div className="text-[11px] text-white/40">Free AU counselling</div>
                  </div>
                </div>

                {Object.keys(utm).length > 0 && (
                  <div className="mt-6 rounded-[12px] bg-white/[0.04] border border-white/[0.06] p-3 text-[11px] text-white/40">
                    <div className="font-bold text-white/60 mb-1 flex items-center gap-1.5"><MousePointerClick className="w-3.5 h-3.5" /> UTM Tracking (for launch)</div>
                    <div className="flex flex-wrap gap-1.5">{Object.entries(utm).map(([k, v]) => <span key={k} className="px-2 py-0.5 rounded-full bg-white/[0.06] border border-white/[0.08]">{k}={v}</span>)}</div>
                  </div>
                )}
              </div>

              {/* Phone mockup */}
              <div className="lg:col-span-5 flex justify-center lg:justify-end">
                <div className="relative">
                  <div className="absolute -inset-10 bg-gradient-to-br from-emerald-500/20 to-violet-500/15 blur-[40px] rounded-[40px]" />
                  <div className="relative w-[300px] lg:w-[340px] h-[620px] rounded-[44px] border-[8px] border-[#1c1c1f] bg-black shadow-[0_30px_80px_rgba(0,0,0,0.8)] overflow-hidden">
                    <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[100px] h-[24px] bg-[#1c1c1f] rounded-b-[12px] z-20" />
                    <div className="h-full bg-[#0f0f10] p-4 pt-10 flex flex-col">
                      <div className="flex items-center justify-between mb-4"><div className="flex items-center gap-2"><div className="w-7 h-7 rounded-[9px] bg-white text-black flex items-center justify-center"><Wind className="w-4 h-4" /></div><span className="text-[13px] font-bold">Clear+</span></div><span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-300 border border-emerald-500/20">LIVE</span></div>
                      <div className="rounded-[20px] bg-[#161618] border border-white/[0.06] p-4">
                        <div className="text-[10px] tracking-widest uppercase font-bold text-white/30">Smoke-free for</div>
                        <div className="mt-2 flex items-baseline gap-2"><span className="text-[36px] font-[900] leading-none">{String(days).padStart(2, '0')}</span><span className="text-[12px] text-white/40">days</span></div>
                        <div className="mt-3 flex gap-4 text-center">
                          <div><div className="text-[18px] font-bold">{String(hours).padStart(2, '0')}</div><div className="text-[9px] text-white/30 uppercase">hrs</div></div>
                          <div><div className="text-[18px] font-bold">{String(mins).padStart(2, '0')}</div><div className="text-[9px] text-white/30 uppercase">min</div></div>
                          <div><div className="text-[18px] font-bold">{String(secs).padStart(2, '0')}</div><div className="text-[9px] text-white/30 uppercase">sec</div></div>
                        </div>
                        <div className="mt-4 h-1.5 rounded-full bg-white/[0.06] overflow-hidden"><div className="h-full bg-emerald-400 rounded-full" style={{ width: `${progressPct}%` }} /></div>
                      </div>
                      <div className="mt-4 grid grid-cols-2 gap-2">
                        <div className="rounded-[14px] bg-emerald-500/10 border border-emerald-500/20 p-3"><div className="text-[10px] text-emerald-200/60 uppercase font-bold">Saved</div><div className="text-[16px] font-bold text-emerald-300">${moneySaved.toFixed(0)}</div></div>
                        <div className="rounded-[14px] bg-white/[0.04] border border-white/[0.06] p-3"><div className="text-[10px] text-white/30 uppercase font-bold">Avoided</div><div className="text-[16px] font-bold">{cigsAvoided} cigs</div></div>
                      </div>
                      <div className="mt-4 rounded-[14px] bg-white text-black p-3 flex items-center justify-between"><span className="text-[12px] font-bold flex items-center gap-2"><Wind className="w-4 h-4" /> SOS Breathing</span><span className="w-6 h-6 rounded-full bg-black text-white flex items-center justify-center"><Play className="w-3 h-3" /></span></div>
                      <div className="mt-auto flex justify-center gap-6 text-white/20"><LayoutDashboard className="w-5 h-5 text-white" /><LifeBuoy className="w-5 h-5" /><NotebookPen className="w-5 h-5" /><Trophy className="w-5 h-5" /></div>
                    </div>
                  </div>
                  {/* floating cards */}
                  <div className="absolute -left-12 top-[120px] rounded-[14px] bg-[#1a1a1d] border border-white/[0.10] p-3 shadow-[0_10px_30px_rgba(0,0,0,0.5)]">
                    <div className="text-[11px] text-white/40">Daily saving</div><div className="text-[14px] font-bold text-emerald-300">${dailyCost.toFixed(2)}/day</div>
                  </div>
                  <div className="absolute -right-10 bottom-[140px] rounded-[14px] bg-[#1a1a1d] border border-white/[0.10] p-3 shadow-[0_10px_30px_rgba(0,0,0,0.5)]">
                    <div className="text-[11px] text-white/40">Cravings beaten</div><div className="text-[14px] font-bold">{cravingsPassed} wins 🔥</div>
                  </div>
                </div>
              </div>
            </section>

            {/* How it Works */}
            <section id="how" className="max-w-[1280px] mx-auto px-4 lg:px-7 py-16 border-t border-white/[0.06]">
              <div className="flex items-end justify-between gap-4 flex-wrap">
                <div><div className="text-[11px] tracking-[0.18em] font-bold text-white/30 uppercase">How it Works</div><h2 className="mt-2 text-[32px] lg:text-[40px] font-[900] tracking-[-0.03em] leading-[1.05]">Three steps.<br />No lectures.</h2></div>
                <div className="text-[13px] text-white/40 max-w-[360px]">Designed by someone who actually quit in regional QLD. Not a corporation. Not a guilt trip.</div>
              </div>
              <div className="mt-10 grid grid-cols-1 md:grid-cols-3 gap-4">
                {[
                  { n: '01', title: 'Set quit date', desc: 'Pick your last smoke. We calculate AU costs at $50/25-pack ($2/cig). Timer starts instantly.', icon: TimerReset, color: 'emerald' },
                  { n: '02', title: 'Beat cravings with SOS', desc: '4-7-8 breathing. 3 free/day, unlimited with Clear+. Log trigger, watch it pass in 3-5 min.', icon: Wind, color: 'violet' },
                  { n: '03', title: 'Watch savings grow', desc: 'Jar fills visually. Share your win as a 1080x1080 image. Bali flights, milk cartons, real life.', icon: PiggyBank, color: 'amber' },
                ].map(s => (
                  <div key={s.n} className="rounded-[24px] bg-[#121214] border border-white/[0.06] p-6 relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-[120px] h-[120px] rounded-full blur-[30px] opacity-[0.15] bg-emerald-500" />
                    <div className="relative">
                      <div className="flex items-center justify-between"><span className="text-[12px] font-bold tracking-widest text-white/20">{s.n}</span><div className={`w-10 h-10 rounded-[12px] bg-${s.color}-500/15 border border-${s.color}-500/20 flex items-center justify-center`}><s.icon className="w-5 h-5 text-white/70" /></div></div>
                      <h3 className="mt-6 text-[18px] font-bold">{s.title}</h3>
                      <p className="mt-2 text-[13px] leading-[1.6] text-white/50">{s.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </section>

            {/* Founder Story */}
            <section id="founder" className="max-w-[1280px] mx-auto px-4 lg:px-7 py-16 border-t border-white/[0.06]">
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
                <div className="lg:col-span-5">
                  <div className="rounded-[28px] bg-[#131315] border border-white/[0.08] p-6 lg:p-7 overflow-hidden relative">
                    <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/[0.08] to-amber-500/[0.06]" />
                    <div className="relative">
                      <div className="flex items-center gap-3"><MapPin className="w-4 h-4 text-emerald-300" /><span className="text-[11px] tracking-widest uppercase font-bold text-white/30">Founder Story • Nanango, QLD</span></div>
                      <div className="mt-6 flex gap-5 items-start">
                        <div className="relative shrink-0">
                          <div className="w-[96px] h-[96px] rounded-[20px] bg-[#1a1a1d] border border-white/[0.10] overflow-hidden flex items-center justify-center">
                            {founderPhoto ? <img src={founderPhoto} alt="Founder" className="w-full h-full object-cover" /> : <span className="text-[32px]">👨‍🌾</span>}
                          </div>
                          <label className="mt-2 flex h-8 w-full items-center justify-center gap-1.5 rounded-full bg-white/[0.06] border border-white/[0.10] text-[11px] font-medium cursor-pointer hover:bg-white/[0.10]">
                            <Upload className="w-3.5 h-3.5" /> Upload<input type="file" accept="image/*" className="hidden" onChange={e => {
                              const f = e.target.files?.[0]; if (!f) return; const r = new FileReader(); r.onload = () => { const v = r.result as string; setFounderPhoto(v); try { localStorage.setItem('clear_founder_photo', v); } catch {} }; r.readAsDataURL(f);
                            }} />
                          </label>
                        </div>
                        <div>
                          <div className="text-[18px] font-bold leading-[1.3]">"I quit years ago in Nanango, QLD and never looked back."</div>
                          <div className="mt-3 text-[13px] leading-[1.7] text-white/60">I built Clear because I know how hard it is, and how much better life is after. No lectures, just a tool that actually helped me stay quit. I journaled cravings, watched the jar fill, and counted flights to Bali I could now afford. Clear is the app I wish I had.</div>
                          <div className="mt-4 flex items-center gap-2 text-[11px] text-white/30"><span className="px-2 py-1 rounded-full bg-white/[0.06] border border-white/[0.08]">8 years smoke-free</span><span className="px-2 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-300">Regional QLD • Founder</span></div>
                        </div>
                      </div>
                      <div className="mt-6 rounded-[14px] bg-black/40 border border-white/[0.06] p-4 flex gap-2">
                        <Quote className="w-4 h-4 text-white/30 shrink-0 mt-0.5" />
                        <div className="text-[12px] leading-[1.6] text-white/50">
                          <div>No dark patterns, no guilt trips, no ads selling you vapes. Free tier is actually useful.</div>
                          <div className="mt-2 font-bold text-white/70">Plus from $9.99 a month. $29.95 a year. Or for a limited time only, the first 100 receive a lifetime membership for $49.95.</div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="lg:col-span-7 space-y-4">
                  <div className="rounded-[24px] bg-[#121214] border border-white/[0.06] p-6">
                    <h3 className="text-[13px] font-bold flex items-center gap-2"><Users className="w-4 h-4" /> Why people stick with Clear+</h3>
                    <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="rounded-[14px] bg-white/[0.03] border border-white/[0.06] p-4"><div className="w-8 h-8 rounded-[10px] bg-emerald-500/15 flex items-center justify-center mb-2"><TimerReset className="w-4 h-4 text-emerald-300" /></div><div className="text-[13px] font-bold">Live timer that matters</div><div className="text-[11px] text-white/40 mt-1">Seconds ticking since your last smoke. Real time, real stakes.</div></div>
                      <div className="rounded-[14px] bg-white/[0.03] border border-white/[0.06] p-4"><div className="w-8 h-8 rounded-[10px] bg-violet-500/15 flex items-center justify-center mb-2"><Wind className="w-4 h-4 text-violet-300" /></div><div className="text-[13px] font-bold">SOS that works at 2am</div><div className="text-[11px] text-white/40 mt-1">4-7-8 breathing cuts craving intensity up to 60%. Try it now.</div></div>
                      <div className="rounded-[14px] bg-white/[0.03] border border-white/[0.06] p-4"><div className="w-8 h-8 rounded-[10px] bg-amber-500/15 flex items-center justify-center mb-2"><Share2 className="w-4 h-4 text-amber-300" /></div><div className="text-[13px] font-bold">Share your win</div><div className="text-[11px] text-white/40 mt-1">Generate a 1080x1080 image with your stats. QR code, branding, download.</div></div>
                      <div className="rounded-[14px] bg-white/[0.03] border border-white/[0.06] p-4"><div className="w-8 h-8 rounded-[10px] bg-sky-500/15 flex items-center justify-center mb-2"><Wallet className="w-4 h-4 text-sky-300" /></div><div className="text-[13px] font-bold">AU prices, not US</div><div className="text-[11px] text-white/40 mt-1">$50/25-pack default. 2026 prices. Bali flights & milk math.</div></div>
                    </div>
                  </div>
                  <div className="rounded-[20px] bg-gradient-to-br from-white/[0.06] to-white/[0.02] border border-white/[0.08] p-5 flex gap-3">
                    <div className="w-8 h-8 rounded-full bg-white text-black flex items-center justify-center shrink-0"><Heart className="w-4 h-4" /></div>
                    <div><div className="text-[13px] leading-[1.6] text-white/80 italic">"{QUOTES[0]}"</div><div className="text-[11px] text-white/30 mt-2">Founder note • Written on my 90th day quit. Still true.</div></div>
                  </div>
                </div>
              </div>
            </section>

            {/* Pricing */}
            <section id="pricing" className="max-w-[1280px] mx-auto px-4 lg:px-7 py-16 border-t border-white/[0.06]">
              <div className="text-center max-w-[680px] mx-auto">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-[11px] font-bold tracking-widest uppercase text-emerald-300"><Crown className="w-3.5 h-3.5" /> Ethical Pricing • No Dark Patterns</div>
                <h2 className="mt-4 text-[36px] lg:text-[48px] font-[900] tracking-[-0.03em] leading-[1.05]">Free is useful.<br />Plus keeps you quit.</h2>
                <p className="mt-4 text-[14px] leading-[1.6] text-white/60">No dark patterns, no guilt trips, no ads selling you vapes. Free tier is actually useful.</p>
                <p className="mt-3 text-[13px] leading-[1.6] text-white/45 max-w-[520px] mx-auto">Plus from $9.99 a month. $29.95 a year. Or for a limited time only, the first 100 receive a lifetime membership for $49.95.</p>
                <div className="mt-8 flex flex-col items-center gap-3">
                  <div className="p-1 rounded-full bg-white/[0.06] border border-white/[0.08] flex">
                    <button onClick={() => setBilling('monthly')} className={`h-9 px-5 rounded-full text-[12px] font-bold transition ${billing === 'monthly' ? 'bg-white text-black' : 'text-white/50'}`}>Monthly $9.99</button>
                    <button onClick={() => setBilling('yearly')} className={`h-9 px-5 rounded-full text-[12px] font-bold transition flex items-center gap-1.5 ${billing === 'yearly' ? 'bg-white text-black' : 'text-white/50'}`}>Yearly $29.95 <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-emerald-500 text-black">Save 75%</span></button>
                    <button onClick={() => setBilling('lifetime')} className={`h-9 px-5 rounded-full text-[12px] font-bold transition flex items-center gap-1.5 ${billing === 'lifetime' ? 'bg-amber-300 text-black' : 'text-white/50'}`}>Lifetime $49.95</button>
                  </div>
                  <div className="text-[11px] text-white/30 font-mono text-center">price_1UGa3KRsZqvWlIOH • price_1UGawQRsZqvWlIOH • price_1UGac6RsZqvWlIOH</div>
                </div>
              </div>

              <div className="mt-10 grid grid-cols-1 lg:grid-cols-12 gap-6 max-w-[1040px] mx-auto">
                <div className="lg:col-span-5 rounded-[28px] bg-[#121214] border border-white/[0.06] p-7">
                  <div className="flex items-center justify-between"><h3 className="text-[18px] font-bold">Free</h3><span className="text-[11px] px-2 py-1 rounded-full bg-white/[0.06] border border-white/[0.08] text-white/40">$0 forever</span></div>
                  <div className="mt-6 space-y-3 text-[13px]">
                    {['Smoke-free timer with seconds', 'AU cost calc $50/25-pack', '3 SOS breathing / day', '7-day craving & journal', 'Basic achievements', 'Pledge jar (5% fee)'].map(f => (
                      <div key={f} className="flex items-center gap-2 text-white/70"><Check className="w-4 h-4 text-white/40" />{f}</div>
                    ))}
                  </div>
                  <button onClick={() => enterApp('pricing_free')} className="mt-8 w-full h-12 rounded-full bg-white/[0.08] border border-white/[0.10] font-bold text-[13px]">Start Quitting Free</button>
                  <div className="mt-3 text-[10px] text-center text-white/30">No credit card • Local storage only</div>
                </div>
                <div className="lg:col-span-7 rounded-[28px] bg-white text-black p-7 relative overflow-hidden shadow-[0_20px_80px_rgba(255,255,255,0.15)]">
                  <div className="absolute top-0 right-0 w-[200px] h-[200px] bg-emerald-400/20 blur-[40px] rounded-full" />
                  <div className="relative">
                    <div className="flex items-center justify-between"><div className="flex items-center gap-2"><Crown className="w-5 h-5" /><h3 className="text-[18px] font-[900]">Clear+</h3><span className="px-2 py-0.5 rounded-full bg-black text-white text-[10px] font-bold tracking-widest">{billing === 'lifetime' ? 'LIFETIME FOUNDER' : billing === 'yearly' ? 'BEST VALUE' : 'MOST POPULAR'}</span></div><div className="text-right"><div className="text-[28px] font-[900] leading-none">{billing === 'lifetime' ? '$49.95' : billing === 'yearly' ? '$29.95' : '$9.99'}</div><div className="text-[11px] opacity-60">{billing === 'lifetime' ? 'once • Lifetime' : billing === 'yearly' ? '/year • Save 75% • $2.50/mo' : '/month'}</div></div></div>
                    <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-3 text-[13px]">
                      {['Unlimited SOS breathing', 'Full analytics & savings chart', 'Craving heatmap & yearly proj', 'Unlimited journal & insights', 'All achievements + Bali fund', 'Pledge jar 0% fee', 'Share image generator', 'Export & pattern detection', 'Funds free users'].map(f => (
                        <div key={f} className="flex items-center gap-2"><div className="w-5 h-5 rounded-full bg-black text-white flex items-center justify-center"><Check className="w-3 h-3" /></div>{f}</div>
                      ))}
                    </div>
                    <div className="mt-4 grid grid-cols-3 gap-2 text-[10px] font-mono">
                      <div className={`rounded-[10px] border p-2 ${billing === 'monthly' ? 'bg-black text-white border-black' : 'bg-black/[0.04] border-black/[0.08] opacity-60'}`}><div className="font-bold">Monthly</div>price_1UGa3KRsZqvWlIOHvkRsX1TM<br/>$9.99/mo</div>
                      <div className={`rounded-[10px] border p-2 ${billing === 'yearly' ? 'bg-black text-white border-black' : 'bg-black/[0.04] border-black/[0.08] opacity-60'}`}><div className="font-bold flex items-center gap-1">Yearly <span className="px-1 rounded bg-emerald-400 text-black text-[8px]">BEST</span></div>price_1UGawQRsZqvWlIOHGpXi1NJl<br/>$29.95/yr • Save 75%</div>
                      <div className={`rounded-[10px] border p-2 ${billing === 'lifetime' ? 'bg-amber-400 text-black border-amber-400' : 'bg-black/[0.04] border-black/[0.08] opacity-60'}`}><div className="font-bold">Lifetime</div>price_1UGac6RsZqvWlIOHbwlEO7Yv<br/>$49.95 once • {isFounderSoldOut ? 'Sold Out' : `${founderRemaining} left`}</div>
                    </div>
                    <button onClick={() => { enterApp('pricing_plus'); setTimeout(() => openPaywall('Landing Pricing'), 400); }} className="mt-6 w-full h-[52px] rounded-full bg-black text-white font-[900] text-[14px] flex items-center justify-center gap-2">
                      <Crown className="w-5 h-5" /> Get Clear+ — {billing === 'lifetime' ? (isFounderSoldOut ? 'Founder Sold Out' : `$49.95 Lifetime • ${founderRemaining} left`) : billing === 'yearly' ? '$29.95/year • Best Value' : '$9.99/month'}
                    </button>
                    <div className="mt-3 text-[11px] text-center opacity-80 font-medium tracking-tight leading-[1.5]">Plus from $9.99 a month. $29.95 a year. Or for a limited time only, the first 100 receive a lifetime membership for $49.95.</div>
                    <div className="mt-2 text-[10px] text-center opacity-40 font-mono">price_1UGa3KRsZqvWlIOHvkRsX1TM • price_1UGawQRsZqvWlIOHGpXi1NJl • price_1UGac6RsZqvWlIOHbwlEO7Yv • prod_VH8JKn97ec1n57 • {founderRemaining} of 100 left</div>
                    <div className="mt-4 rounded-[12px] bg-black/[0.06] border border-black/[0.08] p-3 text-[11px] leading-[1.6] text-black/60">
                      <div>No dark patterns, no guilt trips, no ads selling you vapes. Free tier is actually useful.</div>
                      <div className="mt-1.5 font-bold text-black/80">Plus from $9.99 a month. $29.95 a year. Or for a limited time only, the first 100 receive a lifetime membership for $49.95.</div>
                    </div>
                  </div>
                </div>
              </div>
            </section>

            {/* Social Proof */}
            <section className="max-w-[1280px] mx-auto px-4 lg:px-7 py-16 border-t border-white/[0.06]">
              <div className="flex items-center gap-2 mb-8"><Star className="w-4 h-4 text-amber-300" /><h2 className="text-[12px] tracking-[0.14em] font-bold text-white/30 uppercase">Loved by quitters across Australia</h2></div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {TESTIMONIALS.map(t => (
                  <div key={t.name} className="rounded-[20px] bg-[#121214] border border-white/[0.06] p-6">
                    <div className="flex items-center gap-1">{Array.from({ length: 5 }).map((_, i) => <Star key={i} className="w-4 h-4 fill-amber-300 text-amber-300" />)}</div>
                    <div className="mt-3 text-[14px] leading-[1.6] text-white/75 italic">"{t.text}"</div>
                    <div className="mt-4 flex items-center justify-between"><span className="text-[12px] font-bold text-white/60">{t.name}</span><span className="px-2 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-[11px] font-bold">{t.saved} • {t.days}d</span></div>
                  </div>
                ))}
              </div>
            </section>

            {/* Final CTA */}
            <section className="max-w-[1280px] mx-auto px-4 lg:px-7 py-16">
              <div className="rounded-[32px] bg-gradient-to-br from-white to-white/90 text-black p-8 lg:p-12 relative overflow-hidden">
                <div className="absolute -top-[50px] -right-[50px] w-[300px] h-[300px] rounded-full bg-emerald-400/20 blur-[30px]" />
                <div className="relative grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
                  <div><h2 className="text-[32px] lg:text-[44px] font-[900] tracking-[-0.03em] leading-[1.05]">Ready to keep the money and feel amazing?</h2><p className="mt-4 text-[14px] leading-[1.6] opacity-60 max-w-[420px]">Free tier is actually useful. No ads. Timer, SOS, 7-day history. Upgrade when you want to go deeper. Built in regional QLD.</p></div>
                  <div className="flex flex-col gap-3">
                    <button onClick={() => enterApp('final_cta')} className="h-[52px] rounded-full bg-black text-white font-[900] text-[14px] flex items-center justify-center gap-2"><Rocket className="w-5 h-5" /> Start Quitting Free — Open App</button>
                    <div className="flex items-center justify-center gap-2 text-[11px] opacity-60"><ShieldCheck className="w-4 h-4" /> Quitline 13 7848 • Not medical advice • All local • PWA installable</div>
                    {referral && <div className="text-[11px] text-center opacity-60">Referred by: {referral} • UTM tracked locally</div>}
                  </div>
                </div>
              </div>
            </section>

            <footer className="border-t border-white/[0.06] py-8 px-4 lg:px-7 max-w-[1280px] mx-auto w-full flex flex-col sm:flex-row items-center justify-between gap-3 text-[11px] text-white/30">
              <div className="flex items-center gap-2"><Wind className="w-4 h-4" /> Clear+ • By a former smoker, for future non-smokers • AU 2026 • Quitline 13 7848 • Not medical advice</div>
              <div className="flex items-center gap-3"><span className="px-2 py-1 rounded-full bg-white/[0.04] border border-white/[0.06]">PWA • Offline • {globalSavedCounter.toLocaleString()} saved live</span><button onClick={() => enterApp('footer')} className="px-3 py-1 rounded-full bg-white text-black font-bold">Open App</button></div>
            </footer>
          </main>
        </>
      )}

      {/* ===== APP MODE ===== */}
      {mode === 'app' && (
        <>
          {/* App Header */}
          <header className="relative z-30 h-[68px] flex items-center justify-between px-4 lg:px-7 border-b border-white/[0.06] bg-[#0e0e10]/90 backdrop-blur-2xl sticky top-0">
            <div className="flex items-center gap-4">
              <button onClick={() => { if(localStorage.getItem('clear_isFounder')==='true') setMode('landing') }} className="w-9 h-9 rounded-[12px] bg-white text-black flex items-center justify-center font-bold shadow-[0_0_20px_rgba(255,255,255,0.15)]"><Wind className="w-5 h-5" /></button>
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-[800] tracking-[-0.03em] text-[18px] leading-none">Clear</span>
                  <span className="text-[10px] tracking-[0.16em] font-bold px-2 py-0.5 rounded-full bg-white text-black">+</span>
                  {isPremium && <span className="hidden sm:inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-500/20 text-emerald-300"><Crown className="w-3 h-3" /> PLUS</span>}
                  <button onClick={() => { if(localStorage.getItem('clear_isFounder')==='true') setMode('landing') }} className="hidden sm:flex text-[10px] px-2 py-0.5 rounded-full bg-white/[0.06] border border-white/[0.08] text-white/40 hover:text-white/70">Landing</button>
                </div>
                <div className="text-[11px] text-white/40 mt-0.5 hidden sm:block tracking-wide">By a former smoker, for future non-smokers • {referral ? `ref: ${referral}` : 'App Mode'}</div>
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
                <button onClick={() => openPaywall('Clear+ Premium')} className="h-9 px-4 rounded-full bg-gradient-to-br from-white to-white/80 text-black text-[12px] font-bold flex items-center gap-1.5 hover:scale-[1.02] transition shadow-[0_4px_20px_rgba(255,255,255,0.2)]">
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
            {activeTab === 'dashboard' && (
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                <div className="lg:col-span-7 space-y-6">
                  {/* Timer */}
                  <div className="relative rounded-[28px] bg-[#131315] border border-white/[0.08] overflow-hidden shadow-[0_20px_80px_rgba(0,0,0,0.5)]">
                    <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/[0.12] via-transparent to-violet-500/[0.10]" />
                    <div className="relative p-6 lg:p-7">
                      <div className="flex items-start justify-between">
                        <div>
                          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-[11px] tracking-widest font-bold text-emerald-300 uppercase"><Flame className="w-3.5 h-3.5" /> {progressPct}% to first month • {isPremium ? 'Clear+' : 'Free'} • ${globalSavedCounter.toLocaleString()} community saved</div>
                          <div className="mt-3 text-[11px] tracking-[0.18em] font-semibold text-white/25 uppercase">Smoke-free for</div>
                          <div className="mt-2 flex flex-wrap items-baseline gap-3">
                            <div className="flex items-baseline gap-2"><span className="text-[52px] lg:text-[64px] font-[900] tracking-[-0.05em] leading-none">{String(days).padStart(2, '0')}</span><span className="text-[13px] text-white/30 uppercase tracking-widest font-semibold">days</span></div>
                            <div className="h-10 w-px bg-white/10 hidden sm:block" />
                            <div className="flex gap-5">
                              {[{ v: hours, l: 'hrs' }, { v: mins, l: 'min' }, { v: secs, l: 'sec' }].map(b => (
                                <div key={b.l} className="text-center"><div className="text-[26px] font-[800] leading-none tabular-nums">{String(b.v).padStart(2, '0')}</div><div className="text-[10px] tracking-widest uppercase text-white/30 mt-1 font-bold">{b.l}</div></div>
                              ))}
                            </div>
                          </div>
                        </div>
                        <button onClick={() => { setActiveTab('sos'); setShowSOSFull(true); setBreathRunning(true); }} className="hidden lg:flex w-11 h-11 rounded-full bg-white text-black items-center justify-center hover:scale-105 transition"><Wind className="w-5 h-5" /></button>
                      </div>
                      <div className="mt-6 flex gap-2">
                        <button onClick={() => { setShareType('money'); setShowShare(true); }} className="h-10 px-4 rounded-full bg-white text-black font-bold text-[12px] flex items-center gap-1.5"><Share2 className="w-4 h-4" /> Share Your Win</button>
                        <button onClick={() => setShowCravingForm(true)} className="h-10 px-4 rounded-full bg-white/[0.06] border border-white/[0.08] text-[12px]">Log craving</button>
                        <button onClick={() => { setShareType('days'); setShowShare(true); }} className="h-10 px-4 rounded-full bg-emerald-500/15 border border-emerald-500/20 text-emerald-300 text-[12px] font-semibold">Share days</button>
                      </div>
                      <div className="mt-6">
                        <div className="flex justify-between text-[11px] text-white/40 mb-2"><span>Progress to 30 days</span><span>{progressPct}%</span></div>
                        <div className="h-2 rounded-full bg-white/[0.06] overflow-hidden"><div className="h-full rounded-full bg-gradient-to-r from-emerald-400 to-teal-300 transition-all duration-1000" style={{ width: `${progressPct}%` }} /></div>
                      </div>
                      <div className="mt-6 grid grid-cols-3 gap-3">
                        <div className="rounded-[16px] bg-white/[0.04] border border-white/[0.06] p-3.5"><div className="w-7 h-7 rounded-[9px] bg-white/[0.08] flex items-center justify-center mb-2"><Cigarette className="w-4 h-4 text-white/60" /></div><div className="text-[20px] font-bold leading-none">{cigsAvoided}</div><div className="text-[11px] text-white/40 mt-1">cigs avoided</div></div>
                        <div className="rounded-[16px] bg-emerald-500/10 border border-emerald-500/20 p-3.5"><div className="w-7 h-7 rounded-[9px] bg-emerald-500/20 flex items-center justify-center mb-2"><DollarSign className="w-4 h-4 text-emerald-300" /></div><div className="text-[20px] font-bold leading-none text-emerald-300">${moneySaved.toFixed(2)}</div><div className="text-[11px] text-emerald-200/60 mt-1">saved AUD</div></div>
                        <div className="rounded-[16px] bg-white/[0.04] border border-white/[0.06] p-3.5"><div className="w-7 h-7 rounded-[9px] bg-violet-500/15 flex items-center justify-center mb-2"><Clock className="w-4 h-4 text-violet-300" /></div><div className="text-[20px] font-bold leading-none">{lifeSavedHours}h</div><div className="text-[11px] text-white/40 mt-1">life regained</div></div>
                      </div>
                    </div>
                  </div>

                  {/* AU Cost Calculator */}
                  <div className="rounded-[24px] bg-[#121214] border border-white/[0.06] overflow-hidden">
                    <div className="p-6">
                      <div className="flex items-center justify-between mb-5">
                        <div className="flex items-center gap-3"><div className="w-8 h-8 rounded-[10px] bg-emerald-500/15 border border-emerald-500/20 flex items-center justify-center"><Wallet className="w-4 h-4 text-emerald-300" /></div><div><h2 className="text-[13px] font-bold tracking-[-0.01em]">AU Real Cost Calculator</h2><div className="text-[11px] text-white/40">Default: 20/day • $50/25-pack = $40/day • 2026 prices</div></div></div>
                        <div className="text-[11px] px-2.5 py-1 rounded-full bg-white/[0.06] border border-white/[0.08] text-white/50">${pricePerCig.toFixed(2)}/cig</div>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <div className="sm:col-span-2 rounded-[16px] bg-white/[0.03] border border-white/[0.06] p-4">
                          <div className="flex justify-between items-center mb-3"><label className="text-[11px] tracking-widest uppercase font-bold text-white/30">Cigarettes / Day</label><span className="text-[13px] font-bold tabular-nums">{cigsPerDay}</span></div>
                          <input type="range" min={1} max={60} value={cigsPerDay} onChange={e => setCigsPerDay(parseInt(e.target.value))} className="w-full accent-white h-1.5" />
                          <div className="grid grid-cols-3 gap-2 mt-5">
                            <div><label className="text-[10px] uppercase tracking-widest font-bold text-white/30 mb-1.5 block">Pack size</label><div className="flex gap-1.5">{[20, 25, 30].map(sz => (<button key={sz} onClick={() => setPackSize(sz)} className={`flex-1 h-9 rounded-[10px] text-[12px] font-bold border transition ${packSize === sz ? 'bg-white text-black border-white' : 'bg-white/[0.04] border-white/[0.08] text-white/50'}`}>{sz}</button>))}</div></div>
                            <div className="col-span-2"><label className="text-[10px] uppercase tracking-widest font-bold text-white/30 mb-1.5 block">Price per pack (AUD)</label><div className="relative"><span className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30 text-[12px]">$</span><input type="number" step="1" min={0} value={costPerPack} onChange={e => setCostPerPack(Math.max(0, parseFloat(e.target.value) || 0))} className="w-full h-9 pl-6 pr-3 rounded-[10px] bg-[#0f0f10] border border-white/[0.08] text-[13px] focus:outline-none focus:border-white/20" /></div><div className="text-[10px] text-white/30 mt-1.5">$40/20-pack, $50-55/25-pack (AU 2026)</div></div>
                          </div>
                        </div>
                        <div className="rounded-[16px] bg-gradient-to-br from-emerald-500/[0.12] to-teal-500/[0.06] border border-emerald-500/20 p-4 flex flex-col justify-between">
                          <div><div className="text-[11px] tracking-widest uppercase font-bold text-emerald-200/60 mb-3">You save</div>
                            <div className="space-y-2.5">
                              <div className="flex justify-between items-baseline"><span className="text-[11px] text-white/40">Daily</span><span className="text-[14px] font-bold tabular-nums">${dailyCost.toFixed(2)}</span></div>
                              <div className="flex justify-between items-baseline"><span className="text-[11px] text-white/40">Weekly</span><span className="text-[14px] font-semibold tabular-nums">${(dailyCost * 7).toFixed(0)}</span></div>
                              <div className="flex justify-between items-baseline"><span className="text-[11px] text-white/40">Monthly</span><span className="text-[14px] font-semibold tabular-nums">${monthlyCost.toFixed(0)}</span></div>
                              <div className="h-px bg-emerald-500/20 my-1" />
                              <div className="flex justify-between items-baseline"><span className="text-[11px] text-emerald-200/70">Yearly</span><span className="text-[19px] font-[900] tracking-[-0.02em] tabular-nums text-emerald-300">${yearlyCost.toFixed(0)}</span></div>
                            </div>
                          </div>
                          <div className="mt-4 rounded-[12px] bg-black/40 border border-white/[0.06] p-3">
                            <div className="flex items-center gap-2 text-[11px] font-semibold text-white/60 mb-1.5"><Sparkles className="w-3.5 h-3.5 text-emerald-300" /> That's equivalent to</div>
                            <div className="space-y-1 text-[11px] leading-[1.4]">
                              <div className="flex items-center gap-1.5 text-white/50"><Plane className="w-3.5 h-3.5" /> {baliFlights} return flights SYD→Bali</div>
                              <div className="flex items-center gap-1.5 text-white/50"><Milk className="w-3.5 h-3.5" /> {milkCartons} cartons of milk</div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Health Timeline */}
                  <div className="rounded-[24px] bg-[#121214] border border-white/[0.06] overflow-hidden">
                    <div className="p-6 flex items-center justify-between"><h2 className="text-[12px] tracking-[0.14em] font-bold text-white/30 uppercase">Body Recovery</h2><span className="text-[11px] text-white/30">{HEALTH_MILESTONES.filter(m => totalMins >= m.mins).length}/{HEALTH_MILESTONES.length} milestones</span></div>
                    <div className="px-6 pb-6"><div className="relative"><div className="absolute left-[18px] top-2 bottom-2 w-px bg-gradient-to-b from-emerald-400/50 via-white/10 to-white/5" />
                      <div className="space-y-5">{HEALTH_MILESTONES.map((m, idx) => { const achieved = totalMins >= m.mins; const isNext = !achieved && HEALTH_MILESTONES.slice(0, idx).every(x => totalMins >= x.mins); return (
                        <div key={m.mins} className={`relative flex gap-4 ${!achieved ? 'opacity-70' : ''}`}><div className={`w-9 h-9 rounded-full border flex items-center justify-center shrink-0 z-10 ${achieved ? 'bg-white text-black border-white shadow-[0_0_20px_rgba(255,255,255,0.25)]' : isNext ? 'bg-[#1c1c1f] border-white/20 text-white/60 animate-pulse' : 'bg-[#1a1a1d] border-white/[0.06] text-white/20'}`}><m.icon className="w-4 h-4" /></div><div className="flex-1 min-w-0 pt-0.5"><div className="flex items-center gap-2"><span className={`text-[13px] font-semibold ${achieved ? 'text-white' : 'text-white/60'}`}>{m.title}</span>{achieved && <span className="px-1.5 py-0.5 rounded-full bg-emerald-500/15 text-[10px] text-emerald-300 border border-emerald-500/20">DONE</span>}{isNext && <span className="px-1.5 py-0.5 rounded-full bg-white/[0.08] text-[10px] text-white/50 border border-white/[0.08]">NEXT</span>}</div><div className="text-[12px] text-white/40 leading-[1.5] mt-1">{m.desc}</div></div></div>); })}</div></div></div>
                  </div>
                </div>

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
                          <button onClick={() => openPaywall('Premium Analytics')} className="mt-4 h-11 px-6 rounded-full bg-white text-black font-bold text-[13px] flex items-center gap-2 hover:bg-white/90"><Crown className="w-4 h-4" /> Unlock with Clear+</button>
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
              </div>
            )}

            {activeTab === 'sos' && (
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                <div className="lg:col-span-7">
                  <div className="rounded-[28px] bg-[#131315] border border-white/[0.08] p-6 lg:p-8">
                    <div className="flex items-center justify-between mb-6">
                      <div className="flex items-center gap-3"><div className="w-9 h-9 rounded-full bg-white text-black flex items-center justify-center"><Wind className="w-5 h-5" /></div><div><div className="text-[14px] font-bold">SOS Breathing • 4-7-8</div><div className="text-[11px] text-white/40">Free • Unlimited with Clear+ • {sosUses}/3 today {isPremium ? '(Plus: unlimited)' : ''}</div></div></div>
                      {!isPremium && sosUses >= 3 && <span className="text-[11px] px-2.5 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-300">Limit reached</span>}
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
                          if (!isPremium && sosUses >= 3) { openPaywall('Unlimited SOS'); return; }
                          if (!breathRunning) setSosUses(s => s + 1);
                          setBreathRunning(!breathRunning);
                        }} className="h-12 px-6 rounded-full bg-white text-black font-bold text-[13px] flex items-center gap-2 hover:bg-white/90">
                          {breathRunning ? <><Pause className="w-4 h-4" /> Pause</> : <><Play className="w-4 h-4" /> Start breathing</>}
                        </button>
                        <button onClick={() => { setBreathCount(0); setBreathPhase('inhale'); }} className="h-12 w-12 rounded-full bg-white/[0.08] border border-white/[0.10] flex items-center justify-center"><RotateCcw className="w-4 h-4" /></button>
                      </div>
                    </div>
                    <div className="mt-6 flex gap-3">
                      <button onClick={() => { const id = cravings.find(c => !c.passed)?.id; if (id) markCravingPassed(id); pushToast({ title: 'Craving beaten 💪', body: `${cravingsPassed + 1} cravings defeated.` }); }} className="flex-1 h-12 rounded-full bg-emerald-500 text-black font-bold text-[13px] flex items-center justify-center gap-2"><Sparkles className="w-4 h-4" /> I beat the craving</button>
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
                      <div className="flex gap-2"><Zap className="w-4 h-4 text-emerald-300 shrink-0 mt-0.5" /> Writing cuts relapse risk by 30%. Naming a trigger reduces its power.</div>
                      <div className="flex gap-2"><Heart className="w-4 h-4 text-rose-300 shrink-0 mt-0.5" /> Track mood patterns. See tough days get rarer.</div>
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
                            <div className="rounded-[14px] bg-[#0f0f10] border border-white/[0.06] p-3"><div className="text-[10px] uppercase tracking-widest font-bold text-white/30">Saved so far</div><div className="text-[20px] font-[900] mt-1">${moneySaved.toFixed(2)}</div></div>
                            <div className="rounded-[14px] bg-[#0f0f10] border border-white/[0.06] p-3"><div className="text-[10px] uppercase tracking-widest font-bold text-white/30">Yearly goal</div><div className="text-[20px] font-[900] mt-1">${yearlyCost.toFixed(0)}</div><div className="text-[11px] text-emerald-300">{Math.round((moneySaved / yearlyCost) * 100) || 0}% filled</div></div>
                          </div>
                          <button onClick={() => openPaywall('Pledge Jar Cash-Out')} className="w-full h-12 rounded-[14px] bg-white text-black font-bold text-[13px] flex items-center justify-center gap-2 hover:bg-white/90"><Gift className="w-4 h-4" /> Cash out your savings</button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="lg:col-span-5 space-y-6">
                  <div className="rounded-[24px] bg-gradient-to-br from-white/[0.06] to-white/[0.02] border border-white/[0.08] p-6">
                    <div className="flex items-center gap-2 mb-3"><Crown className="w-4 h-4 text-amber-300" /><h3 className="text-[13px] font-bold">Viral sharing = more quitters</h3></div>
                    <div className="text-[12px] leading-[1.6] text-white/50">Share your win and inspire others. 1080x1080 image with QR to clearplus.app. Canvas generated locally.</div>
                    <button onClick={() => { setShareType('money'); setShowShare(true); }} className="mt-4 w-full h-11 rounded-[12px] bg-white text-black font-bold text-[13px] flex items-center justify-center gap-2"><Share2 className="w-4 h-4" /> Generate share image</button>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'settings' && (
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                <div className="lg:col-span-7 space-y-6">
                  <div className="rounded-[24px] bg-[#121214] border border-white/[0.06] p-6">
                    <h2 className="text-[13px] font-bold mb-5 flex items-center gap-2"><Settings className="w-4 h-4" /> Settings • Cost • Stripe • PWA</h2>
                    <div className="space-y-6">
                      <div><label className="text-[11px] tracking-widest uppercase font-bold text-white/30 mb-2 block">Quit Date & Time</label><input type="datetime-local" value={new Date(quitDate.getTime() - quitDate.getTimezoneOffset() * 60000).toISOString().slice(0, 16)} onChange={e => setQuitDate(new Date(e.target.value))} className="w-full h-11 px-4 rounded-[12px] bg-white/[0.06] border border-white/[0.10] text-[13px] focus:outline-none focus:border-white/20" /></div>
                      <div className="rounded-[16px] bg-white/[0.03] border border-white/[0.06] p-4">
                        <div className="text-[11px] font-bold tracking-widest uppercase text-white/30 mb-3">AU Cost Inputs</div>
                        <div className="grid grid-cols-2 gap-3">
                          <div><label className="text-[10px] uppercase font-bold text-white/30 mb-1.5 block">Cigs / day</label><input type="number" value={cigsPerDay} onChange={e => setCigsPerDay(Math.max(1, parseInt(e.target.value) || 1))} className="w-full h-11 px-3 rounded-[12px] bg-[#0f0f10] border border-white/[0.10] text-[13px]" /></div>
                          <div><label className="text-[10px] uppercase font-bold text-white/30 mb-1.5 block">Price / pack AUD</label><input type="number" value={costPerPack} onChange={e => setCostPerPack(Math.max(0, parseFloat(e.target.value) || 0))} className="w-full h-11 px-3 rounded-[12px] bg-[#0f0f10] border border-white/[0.10] text-[13px]" /></div>
                        </div>
                        <div className="mt-3 flex gap-1.5">{[20, 25, 30].map(s => (<button key={s} onClick={() => setPackSize(s)} className={`flex-1 h-10 rounded-[12px] text-[12px] font-bold border ${packSize === s ? 'bg-white text-black border-white' : 'bg-[#0f0f10] border-white/[0.10] text-white/60'}`}>{s} / pack</button>))}</div>
                      </div>

                      {/* Stripe Connect - FINAL 3 PRICE IDs */}
                      <div className="rounded-[16px] bg-[#101012] border border-white/[0.08] p-4">
                        <div className="text-[11px] font-bold tracking-widest uppercase text-white/30 flex items-center gap-2 mb-3"><ExternalLink className="w-4 h-4 text-violet-300" /> Connect Stripe • FINAL prod_VH8JKn97ec1n57</div>
                        <div className="space-y-3">
                          <div><label className="text-[10px] uppercase font-bold text-white/30 mb-1 block">Stripe Publishable Key (pk_live_... or pk_test_...)</label><input value={stripePublishable} onChange={e => setStripePublishable(e.target.value)} placeholder="pk_test_51..." className="w-full h-10 px-3 rounded-[10px] bg-[#0f0f10] border border-white/[0.10] text-[12px] font-mono" /></div>
                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                            <div><label className="text-[10px] uppercase font-bold text-white/30 mb-1 block">Monthly $9.99</label><input value={stripeMonthlyId} onChange={e => setStripeMonthlyId(e.target.value)} placeholder="price_..." className="w-full h-10 px-3 rounded-[10px] bg-[#0f0f10] border border-white/[0.10] text-[11px] font-mono" /><div className="text-[9px] text-white/30 mt-1 font-mono truncate">{STRIPE_MONTHLY_PRICE_ID} • standard_monthly</div></div>
                            <div><label className="text-[10px] uppercase font-bold text-white/30 mb-1 block">Yearly $29.95 BEST</label><input value={stripeYearlyId} onChange={e => setStripeYearlyId(e.target.value)} placeholder="price_..." className="w-full h-10 px-3 rounded-[10px] bg-[#0f0f10] border border-emerald-500/20 text-[11px] font-mono" /><div className="text-[9px] text-emerald-300/60 mt-1 font-mono truncate">{STRIPE_YEARLY_PRICE_ID} • yearly_29_95 Save 75%</div></div>
                            <div><label className="text-[10px] uppercase font-bold text-white/30 mb-1 block">Lifetime $49.95</label><input value={stripeLifetimeId} onChange={e => setStripeLifetimeId(e.target.value)} placeholder="price_..." className="w-full h-10 px-3 rounded-[10px] bg-[#0f0f10] border border-amber-500/20 text-[11px] font-mono" /><div className="text-[9px] text-amber-300/60 mt-1 font-mono truncate">{STRIPE_LIFETIME_PRICE_ID} • lifetime_founder_100</div></div>
                          </div>
                          <div className="rounded-[10px] bg-violet-500/10 border border-violet-500/20 p-3 text-[11px] leading-[1.5] text-violet-200/70">
                            <div className="font-bold text-violet-200 mb-1">Final Pricing Locked:</div>
                            Monthly: {STRIPE_MONTHLY_PRICE_ID} = $9.99/mo recurring • Yearly: {STRIPE_YEARLY_PRICE_ID} = $29.95/yr recurring (BEST VALUE Save 75%) • Lifetime: {STRIPE_LIFETIME_PRICE_ID} = $49.95 once<br />
                            success_url = ?success=true → auto-unlocks premium. All 3 under prod_VH8JKn97ec1n57.<br />
                            <span className="text-white/50">Mode: {stripeMonthlyId.startsWith('price_') ? 'Real ID — will redirect' : 'Mock'}</span>
                          </div>
                        </div>
                      </div>

                      {/* FOUNDER ADMIN DASHBOARD */}
                      <div className="rounded-[20px] bg-gradient-to-br from-amber-500/[0.12] via-orange-500/[0.08] to-yellow-500/[0.06] border border-amber-400/20 p-5 overflow-hidden relative">
                        <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-amber-300 via-orange-400 to-amber-300" />
                        <div className="flex items-center justify-between mb-4">
                          <div className="flex items-center gap-2"><div className="w-8 h-8 rounded-[10px] bg-amber-400 text-black flex items-center justify-center"><Crown className="w-4 h-4" /></div><div><div className="text-[13px] font-[900] tracking-[-0.01em]">FOUNDER ADMIN DASHBOARD</div><div className="text-[10px] text-amber-200/60 tracking-widest uppercase font-bold">Lifetime First 100 Only • {STRIPE_LIFETIME_PRICE_ID}</div></div></div>
                          <span className={`text-[10px] px-2.5 py-1 rounded-full font-bold border ${isFounderSoldOut ? 'bg-rose-500/15 border-rose-500/20 text-rose-300' : 'bg-amber-500/15 border-amber-500/20 text-amber-300'}`}>{isFounderSoldOut ? 'SOLD OUT • 100/100' : `${founderSold}/100 SOLD • ${founderRemaining} LEFT`}</span>
                        </div>

                        <div className="grid grid-cols-3 gap-3 mb-4">
                          <div className="rounded-[14px] bg-black/40 border border-white/[0.06] p-3"><div className="text-[10px] uppercase tracking-widest font-bold text-white/30">Sold</div><div className="text-[22px] font-[900] leading-none mt-1">{founderSold}</div><div className="text-[10px] text-white/40 mt-1">of 100</div></div>
                          <div className="rounded-[14px] bg-black/40 border border-white/[0.06] p-3"><div className="text-[10px] uppercase tracking-widest font-bold text-white/30">Left</div><div className={`text-[22px] font-[900] leading-none mt-1 ${founderRemaining <= 10 ? 'text-rose-300' : 'text-emerald-300'}`}>{founderRemaining}</div><div className="text-[10px] text-white/40 mt-1">{founderRemaining === 0 ? 'Archive in Stripe' : 'spots left'}</div></div>
                          <div className="rounded-[14px] bg-black/40 border border-white/[0.06] p-3"><div className="text-[10px] uppercase tracking-widest font-bold text-white/30">Revenue</div><div className="text-[18px] font-[900] leading-none mt-1 text-amber-300">${(founderSold * 49.95).toFixed(2)}</div><div className="text-[10px] text-white/40 mt-1">@ $49.95 each</div></div>
                        </div>

                        <div className="mb-4">
                          <div className="flex justify-between text-[10px] font-bold tracking-widest uppercase text-white/30 mb-1.5"><span>Progress to 100</span><span>{founderSold}%</span></div>
                          <div className="h-2.5 rounded-full bg-black/40 border border-white/[0.06] overflow-hidden p-0.5">
                            <div className="h-full rounded-full bg-gradient-to-r from-amber-300 to-orange-400 transition-all duration-500" style={{ width: `${founderSold}%` }} />
                          </div>
                        </div>

                        <div className="flex flex-wrap gap-2 mb-4">
                          <button onClick={() => setFounderSold(s => Math.min(100, s + 1))} className="h-10 px-4 rounded-[10px] bg-white text-black font-bold text-[12px] flex items-center gap-1.5 hover:bg-white/90"><Plus className="w-4 h-4" /> +1 Sold</button>
                          <button onClick={() => setFounderSold(s => Math.max(0, s - 1))} className="h-10 px-4 rounded-[10px] bg-white/[0.08] border border-white/[0.10] text-[12px] font-bold">-1</button>
                          <button onClick={() => { if (confirm('Reset founder counter to 13 demo?')) setFounderSold(13); }} className="h-10 px-4 rounded-[10px] bg-white/[0.06] border border-white/[0.08] text-[11px]">Reset to 13</button>
                          <button onClick={() => setFounderSold(100)} className="h-10 px-4 rounded-[10px] bg-amber-400/20 border border-amber-400/20 text-amber-200 text-[11px] font-bold">Set to 100 (Sold Out)</button>
                        </div>

                        <div className="rounded-[12px] bg-black/50 border border-white/[0.06] p-3 flex gap-3 items-center">
                          <div className="flex-1">
                            <label className="text-[10px] uppercase font-bold text-white/30 mb-1 block">Exact number (0-100)</label>
                            <input type="number" min={0} max={100} value={founderSold} onChange={e => { const n = parseInt(e.target.value); if (!isNaN(n)) setFounderSold(Math.max(0, Math.min(100, n))); }} className="w-full h-10 px-3 rounded-[10px] bg-[#0f0f10] border border-white/[0.10] text-[13px] font-bold" />
                          </div>
                          <div className="text-[11px] leading-[1.4] text-white/40 max-w-[180px]">Sync this number with Stripe sales for <span className="text-white font-mono">{STRIPE_LIFETIME_PRICE_ID}</span>. Persists in localStorage.</div>
                        </div>

                        <div className="mt-4 rounded-[12px] bg-black/60 border border-amber-500/20 p-3 text-[11px] leading-[1.6] text-amber-100/80">
                          <div className="font-bold text-amber-200 flex items-center gap-1.5 mb-1"><Info className="w-3.5 h-3.5" /> Instructions: Archiving at 100</div>
                          When counter hits 100/100:<br />
                          1. Stripe Dashboard → Product prod_VH8JKn97ec1n57 → Price {STRIPE_LIFETIME_PRICE_ID} → <span className="font-bold text-white">Archive Price</span> (not product).<br />
                          2. Update paywall copy to "Founder Sold Out" — code already handles isFounderSoldOut = sold ≥ 100.<br />
                          3. Yearly $29.95 (Save 75%) becomes default best value.<br />
                          4. Keep this counter as truth source for banner: "First 100 Only - X left". Revenue = sold × $49.95.<br />
                          <span className="text-white/50 font-mono text-[10px]">Current: {founderSold} sold • ${ (founderSold * 49.95).toFixed(0)} revenue • {founderRemaining} left • Archive at 100 to prevent oversell.</span>
                        </div>
                      </div>

                      <div className="rounded-[16px] bg-[#101012] border border-white/[0.08] p-4">
                        <div className="flex items-center justify-between mb-3"><div className="text-[11px] font-bold tracking-widest uppercase text-white/30 flex items-center gap-2"><Bell className="w-4 h-4 text-violet-300" /> UTM & Referral</div><span className="text-[10px] px-2 py-1 rounded-full bg-white/[0.06] border border-white/[0.08] text-white/40">{referral || 'no ref'}</span></div>
                        <div className="text-[11px] text-white/40">Stored locally. Landing → App handoff keeps ref. Displayed for launch tracking.</div>
                        {Object.keys(utm).length > 0 && <div className="mt-2 flex flex-wrap gap-1.5">{Object.entries(utm).map(([k, v]) => <span key={k} className="px-2 py-0.5 rounded-full bg-white/[0.06] border border-white/[0.08] text-[10px]">{k}={v}</span>)}</div>}
                      </div>
                    </div>
                  </div>
                </div>
                <div className="lg:col-span-5 space-y-6">
                  <div className="rounded-[24px] bg-[#131315] border border-white/[0.08] p-6">
                    <div className="flex items-center gap-2 mb-4"><Crown className="w-5 h-5 text-amber-300" /><h3 className="text-[14px] font-bold">Subscription</h3></div>
                    {isPremium ? (
                      <div className="space-y-3">
                        <div className="rounded-[14px] bg-emerald-500/10 border border-emerald-500/20 p-4 flex items-center justify-between"><div><div className="text-[13px] font-bold text-emerald-300">Clear+ Active</div><div className="text-[11px] text-emerald-200/60">{billing === 'lifetime' ? 'Lifetime $49.95 • 87 of 100' : billing === 'yearly' ? 'Yearly $29.95 • Save 75% • Best Value' : 'Monthly $9.99'} • Stripe: {stripeMonthlyId.includes('PLACEHOLDER') ? 'Mock' : 'Real ID'}</div></div><Check className="w-5 h-5 text-emerald-300" /></div>
                        <button onClick={() => { setIsPremium(false); pushToast({ title: 'Subscription cancelled (mock)', body: 'Premium disabled. Data kept locally.' }); }} className="w-full h-11 rounded-[12px] bg-white/[0.06] border border-white/[0.10] text-[12px]">Cancel Plus (mock)</button>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        <div className="rounded-[14px] bg-white/[0.04] border border-white/[0.06] p-4"><div className="text-[12px] font-bold">Free tier</div><div className="text-[11px] text-white/40 mt-1">Timer, basic savings, 3 SOS/day, 7-day history</div></div>
                        <button onClick={() => openPaywall('Settings Upgrade')} className="w-full h-11 rounded-[12px] bg-white text-black font-bold text-[13px] flex items-center justify-center gap-2"><Crown className="w-4 h-4" /> Upgrade to Clear+ from $9.99/mo</button>
                      </div>
                    )}
                  </div>
                  <div className="rounded-[24px] bg-[#121214] border border-white/[0.06] p-5">
                    <div className="flex items-center gap-2 mb-3"><Smartphone className="w-4 h-4 text-white/60" /><h3 className="text-[12px] font-bold tracking-widest uppercase text-white/30">PWA & Install</h3></div>
                    <div className="text-[12px] leading-[1.5] text-white/50">Works offline after first load. Install to home screen for standalone app.</div>
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
            <div className="flex items-center gap-2"><Wind className="w-3.5 h-3.5" /> Clear+ • By a former smoker, for future non-smokers • AU pricing 2026 • Quitline 13 7848 • All localStorage</div>
            <div className="flex items-center gap-3"><span className="px-2 py-1 rounded-full bg-white/[0.04] border border-white/[0.06]">{isPremium ? 'Plus • $' + (billing === 'lifetime' ? '49.95 lifetime' : billing === 'yearly' ? '29.95/y Best Value' : '9.99/mo') : 'Free tier'}</span><span>{days}d smoke-free • ${moneySaved.toFixed(0)} saved</span><button onClick={() => setMode('landing')} className="px-2 py-1 rounded-full bg-white/[0.06] border border-white/[0.08]">Landing</button></div>
          </footer>
        </>
      )}

      {/* Paywall Modal */}
      {showPaywall && (
        <div className="fixed inset-0 z-[90] flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="absolute inset-0 bg-black/80 backdrop-blur-xl" onClick={() => setShowPaywall(false)} />
          <div className="relative w-full sm:max-w-[760px] max-h-[94vh] sm:max-h-[90vh] rounded-t-[28px] sm:rounded-[28px] bg-[#121214] border border-white/[0.12] shadow-[0_30px_100px_rgba(0,0,0,0.9)] overflow-hidden flex flex-col">
            <div className="p-6 sm:p-7 overflow-auto">
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-[12px] bg-white text-black flex items-center justify-center shadow-[0_0_20px_rgba(255,255,255,0.2)]"><Crown className="w-5 h-5" /></div>
                  <div><div className="text-[18px] font-[900] tracking-[-0.02em]">Clear+ — Quit for good</div><div className="text-[11px] text-white/40 mt-0.5">By a former smoker, for future non-smokers • Ethical, no dark patterns • Stripe Ready</div></div>
                </div>
                <button onClick={() => setShowPaywall(false)} className="w-9 h-9 rounded-full bg-white/[0.06] border border-white/[0.08] flex items-center justify-center"><X className="w-4 h-4" /></button>
              </div>

              {/* 3 PRICING OPTIONS - FINAL */}
              <div className="mt-6 grid grid-cols-1 sm:grid-cols-3 gap-3">
                {/* Monthly $9.99 */}
                <div className={`rounded-[18px] border p-4 flex flex-col ${billing === 'monthly' ? 'bg-white text-black border-white shadow-[0_8px_30px_rgba(255,255,255,0.15)]' : 'bg-[#0f0f10] border-white/[0.08] text-white'}`}>
                  <div className="flex items-center justify-between mb-3">
                    <span className={`text-[11px] font-bold tracking-widest uppercase ${billing === 'monthly' ? 'text-black/50' : 'text-white/30'}`}>Monthly</span>
                    {billing === 'monthly' && <span className="text-[10px] px-2 py-0.5 rounded-full bg-black text-white font-bold">SELECTED</span>}
                  </div>
                  <div className="text-[26px] font-[900] tracking-[-0.02em] leading-none">$9.99<span className={`text-[13px] font-semibold ${billing === 'monthly' ? 'text-black/60' : 'text-white/40'}`}>/mo</span></div>
                  <div className={`mt-1 text-[11px] ${billing === 'monthly' ? 'text-black/50' : 'text-white/40'}`}>Billed monthly • Cancel anytime</div>
                  <div className="mt-2 text-[10px] font-mono opacity-60 truncate">price_1UGa3KRsZqvWlIOHvkRsX1TM</div>
                  <div className={`mt-1 text-[10px] ${billing === 'monthly' ? 'text-black/40' : 'text-white/30'}`}>lookup: standard_monthly</div>
                  <button onClick={() => { setBilling('monthly'); handleCheckout('monthly'); }} className={`mt-4 w-full h-11 rounded-[12px] font-bold text-[12px] flex items-center justify-center gap-2 ${billing === 'monthly' ? 'bg-black text-white' : 'bg-white text-black'}`}>
                    <Crown className="w-4 h-4" /> Choose Monthly
                  </button>
                </div>
                {/* Yearly $29.95 - Best Value */}
                <div className={`rounded-[18px] border p-4 flex flex-col relative overflow-hidden ${billing === 'yearly' ? 'bg-[#101012] border-emerald-400/40 shadow-[0_8px_30px_rgba(16,185,129,0.18)]' : 'bg-[#0f0f10] border-white/[0.08]'}`}>
                  {billing === 'yearly' && <div className="absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-r from-emerald-400 to-teal-300" />}
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-[11px] font-bold tracking-widest uppercase text-white/30">Yearly</span>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-400 text-black font-[900] tracking-widest uppercase flex items-center gap-1"><Crown className="w-3 h-3" /> BEST VALUE</span>
                  </div>
                  <div className="text-[26px] font-[900] tracking-[-0.02em] leading-none">$29.95<span className="text-[13px] font-semibold text-white/40">/yr</span></div>
                  <div className="mt-1 flex items-center gap-2">
                    <span className="text-[11px] px-1.5 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-500/20 text-emerald-300 font-bold">Save 75%</span>
                    <span className="text-[10px] text-white/30 line-through">$119.88 if monthly</span>
                  </div>
                  <div className="mt-1 text-[11px] text-white/40">$2.50/mo billed yearly • Best deal</div>
                  <div className="mt-2 text-[10px] font-mono text-white/30 truncate">price_1UGawQRsZqvWlIOHGpXi1NJl</div>
                  <div className="mt-1 text-[10px] text-white/30">lookup: yearly_29_95</div>
                  <button onClick={() => { setBilling('yearly'); handleCheckout('yearly'); }} className={`mt-4 w-full h-11 rounded-[12px] font-[900] text-[12px] flex items-center justify-center gap-2 ${billing === 'yearly' ? 'bg-white text-black' : 'bg-emerald-400 text-black'}`}>
                    <Crown className="w-4 h-4" /> Choose Yearly — Best Value
                  </button>
                </div>
                {/* Lifetime Founder $49.95 */}
                <div className="rounded-[18px] border border-amber-400/30 bg-gradient-to-br from-amber-500/[0.14] via-orange-500/[0.08] to-yellow-500/[0.06] p-4 flex flex-col relative overflow-hidden">
                  <div className="absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-r from-amber-300 to-orange-400" />
                  <div className="absolute -top-px -left-px -right-px h-px bg-gradient-to-r from-amber-400/0 via-amber-400/60 to-amber-400/0" />
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-[11px] font-bold tracking-widest uppercase text-amber-200/70">Lifetime</span>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-400 text-black font-[900] tracking-widest uppercase">LIFETIME</span>
                  </div>
                  <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-black/40 border border-amber-400/20 text-[10px] font-bold text-amber-200 w-fit mb-2"><Flame className="w-3 h-3" /> First 100 Only - 87 of 100 left</div>
                  <div className="text-[26px] font-[900] tracking-[-0.02em] leading-none">$49.95<span className="text-[13px] font-semibold text-white/40"> once</span></div>
                  <div className="mt-1 flex items-center gap-2"><span className="text-[11px] text-white/40">Pay once, quit forever</span><span className="text-[10px] text-white/30 line-through">$199 value</span></div>
                  <div className="mt-2 flex items-center gap-2">
                    <div className="flex -space-x-1.5"><div className="w-5 h-5 rounded-full bg-white border-2 border-[#1a1a12] flex items-center justify-center text-[9px]">🔥</div><div className="w-5 h-5 rounded-full bg-emerald-400 border-2 border-[#1a1a12] flex items-center justify-center text-[9px]">💪</div><div className="w-5 h-5 rounded-full bg-amber-300 border-2 border-[#1a1a12] flex items-center justify-center text-[8px] font-bold text-black">+13</div></div>
                    <span className="text-[10px] font-bold text-amber-200/80 animate-pulse">{founderSold} claimed • {isFounderSoldOut ? 'Sold Out' : `${founderRemaining} left`}</span>
                  </div>
                  <div className="mt-2 text-[10px] font-mono text-white/30 truncate">price_1UGac6RsZqvWlIOHbwlEO7Yv</div>
                  <div className="mt-1 text-[10px] text-white/30">lookup: lifetime_founder_100</div>
                  <button disabled={isFounderSoldOut} onClick={() => { setBilling('lifetime'); handleCheckout('lifetime'); }} className={`mt-4 w-full h-11 rounded-[12px] font-[900] text-[12px] flex items-center justify-center gap-2 shadow-[0_8px_24px_rgba(245,158,11,0.30)] transition ${isFounderSoldOut ? 'bg-white/10 text-white/30 border border-white/10 cursor-not-allowed' : 'bg-gradient-to-br from-amber-300 to-orange-400 text-black hover:scale-[1.01]'}`}>
                    <Crown className="w-4 h-4" /> {isFounderSoldOut ? 'Sold Out — 100/100 Claimed' : `Claim Founder Lifetime • ${founderRemaining} left`}
                  </button>
                </div>
              </div>

              <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="rounded-[18px] bg-[#0f0f10] border border-white/[0.06] p-4">
                  <div className="text-[11px] font-bold tracking-widest uppercase text-white/30 mb-3">Free vs Clear+</div>
                  <div className="space-y-2.5 text-[12px]">
                    {[
                      { f: 'Smoke-free timer', free: true, plus: true },
                      { f: 'Basic money saved', free: true, plus: true },
                      { f: 'SOS breathing', free: '3/day', plus: 'Unlimited' },
                      { f: 'Journal & cravings', free: '7-day', plus: 'Unlimited + insights' },
                      { f: 'Achievements', free: 'Basic', plus: 'Full + Bali fund' },
                      { f: 'Savings chart & heatmap', free: false, plus: true },
                      { f: 'Share image generator', free: true, plus: true },
                      { f: 'Pledge jar fee', free: '5%', plus: '0%' },
                      { f: 'Stripe Price IDs ready', free: false, plus: true },
                    ].map(r => (
                      <div key={r.f} className="flex items-center justify-between">
                        <span className="text-white/60">{r.f}</span>
                        <span className="flex items-center gap-2">
                          <span className={`text-[11px] px-1.5 py-0.5 rounded-full border ${r.free ? 'bg-white/[0.06] border-white/[0.08] text-white/50' : 'bg-rose-500/10 border-rose-500/20 text-rose-300/60'}`}>{r.free === true ? '✓' : r.free === false ? '✕' : r.free}</span>
                          <span className="text-[11px] px-1.5 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-500/20 text-emerald-300">{r.plus === true ? '✓' : r.plus}</span>
                        </span>
                      </div>
                    ))}
                  </div>
                  <div className="mt-4 rounded-[10px] bg-amber-500/10 border border-amber-500/20 p-2.5 text-[11px] leading-[1.4] text-amber-200/70">Trigger: {paywallFeature} is a Clear+ feature. Upgrade to unlock.</div>
                  <div className="mt-3 rounded-[10px] bg-white/[0.04] border border-white/[0.06] p-2.5 text-[10px] font-mono leading-[1.4] text-white/40">
                    <div className="font-bold text-white/60 mb-1">FINAL STRIPE - prod_VH8JKn97ec1n57</div>
                    monthly: {stripeMonthlyId} = $9.99/mo (standard_monthly)<br />
                    yearly: {stripeYearlyId} = $29.95/yr (yearly_29_95) Save 75%<br />
                    lifetime: {stripeLifetimeId} = $49.95 once (lifetime_founder_100) {founderRemaining}/100 left • {founderSold} sold<br />
                    pk: {stripePublishable ? stripePublishable.slice(0, 20) + '...' : 'not set (mock mode)'}<br />
                    success_url: ?success=true → unlocks premium
                  </div>
                </div>
                <div className="space-y-4">
                  <div className="rounded-[18px] bg-gradient-to-br from-emerald-500/[0.12] to-teal-500/[0.08] border border-emerald-500/20 p-4">
                    <div className="text-[12px] font-bold text-emerald-200 flex items-center gap-1.5"><Star className="w-4 h-4" /> Loved by quitters</div>
                    <div className="mt-3 space-y-3">
                      {TESTIMONIALS.map(t => (
                        <div key={t.name} className="rounded-[12px] bg-black/30 border border-white/[0.06] p-3">
                          <div className="text-[12px] leading-[1.5] text-white/70 italic">"{t.text}"</div>
                          <div className="text-[11px] text-white/40 mt-1.5 flex items-center gap-2"><span className="font-semibold text-white/60">{t.name}</span><span className="px-1.5 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-500/20 text-emerald-300 text-[10px]">{t.saved} saved</span></div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-6 space-y-3">
                <button disabled={billing === 'lifetime' && isFounderSoldOut} onClick={() => handleCheckout(billing)} className={`w-full h-[52px] rounded-[16px] font-[900] text-[14px] flex items-center justify-center gap-2 shadow-[0_10px_30px_rgba(255,255,255,0.2)] transition ${billing === 'lifetime' && isFounderSoldOut ? 'bg-white/10 text-white/30 border border-white/10 cursor-not-allowed' : 'bg-white text-black hover:bg-white/90'}`}>
                  <Crown className="w-5 h-5" /> {billing === 'lifetime' ? (isFounderSoldOut ? 'Sold Out — Founder Lifetime' : `Claim Founder Lifetime - $49.95 • ${founderRemaining} left`) : billing === 'yearly' ? 'Checkout Yearly $29.95/yr - Best Value Save 75%' : 'Checkout Monthly $9.99/mo'}
                </button>
                <div className="grid grid-cols-2 gap-2">
                  <button onClick={() => { try { const v = localStorage.getItem('clear_isPremium'); if (v === 'true') { setIsPremium(true); pushToast({ title: 'Purchase restored', body: 'Clear+ restored from this device.' }); setShowPaywall(false); } else pushToast({ title: 'No purchase found', body: 'No premium on this device.' }); } catch { pushToast({ title: 'Restore failed', body: 'localStorage unavailable.' }); } }} className="h-11 rounded-[12px] bg-white/[0.06] border border-white/[0.10] text-[12px] font-medium">Restore Purchase</button>
                  <button onClick={() => setShowPaywall(false)} className="h-11 rounded-[12px] bg-white/[0.04] border border-white/[0.06] text-[12px] text-white/50">Maybe later</button>
                </div>
                <div className="text-[11px] text-center text-white/40 leading-[1.5]">
                  <div>No dark patterns, no guilt trips, no ads selling you vapes. Free tier is actually useful.</div>
                  <div className="mt-1 font-bold text-white/70">Plus from $9.99 a month. $29.95 a year. Or for a limited time only, the first 100 receive a lifetime membership for $49.95.</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Share Modal */}
      {showShare && (
        <div className="fixed inset-0 z-[95] flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="absolute inset-0 bg-black/80 backdrop-blur-xl" onClick={() => setShowShare(false)} />
          <div className="relative w-full sm:max-w-[520px] rounded-t-[28px] sm:rounded-[28px] bg-[#121214] border border-white/[0.12] shadow-[0_30px_100px_rgba(0,0,0,0.9)] overflow-hidden flex flex-col max-h-[94vh]">
            <div className="p-6 overflow-auto">
              <div className="flex items-center justify-between mb-5">
                <div className="flex items-center gap-3"><div className="w-9 h-9 rounded-[12px] bg-white text-black flex items-center justify-center"><Share2 className="w-5 h-5" /></div><div><div className="text-[16px] font-bold">Share Your Win</div><div className="text-[11px] text-white/40">Viral 1080x1080 image • Canvas generated locally</div></div></div>
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
                      await navigator.share({ files: [file], title: 'I quit with Clear+', text: `I saved $${moneySaved.toFixed(0)} and quit for ${days} days with Clear+!` });
                    } else if (navigator.share) {
                      // @ts-ignore
                      await navigator.share({ title: 'I quit with Clear+', text: `I saved $${moneySaved.toFixed(0)} and quit for ${days} days with Clear+! clearplus.app` });
                    } else {
                      const url = URL.createObjectURL(blob);
                      window.open(url, '_blank');
                      pushToast({ title: 'Share API not supported', body: 'Downloaded instead. Upload to Instagram/Facebook.' });
                    }
                  } catch (e) {
                    pushToast({ title: 'Share failed', body: 'Download the image and share manually.' });
                  }
                }} className="h-12 rounded-[12px] bg-white/[0.08] border border-white/[0.10] font-bold text-[13px] flex items-center justify-center gap-2"><Share2 className="w-4 h-4" /> System Share</button>
              </div>

              <div className="mt-3 grid grid-cols-2 gap-2">
                <button onClick={() => {
                  const text = `I saved $${moneySaved.toFixed(0)} and quit for ${days} days with Clear+! clearplus.app`;
                  const url = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent('https://clearplus.app')}&quote=${encodeURIComponent(text)}`;
                  window.open(url, '_blank');
                }} className="h-10 rounded-[10px] bg-[#1877F2]/15 border border-[#1877F2]/20 text-[#8AB4FF] text-[12px] font-semibold flex items-center justify-center gap-2"><Facebook className="w-4 h-4" /> Facebook</button>
                <button onClick={() => {
                  pushToast({ title: 'Instagram', body: 'Download PNG, then upload to Instagram Story/Post. QR code links to clearplus.app' });
                }} className="h-10 rounded-[10px] bg-gradient-to-br from-[#FEDA75]/15 via-[#FA7E1E]/15 to-[#D62976]/15 border border-white/[0.08] text-white/80 text-[12px] font-semibold flex items-center justify-center gap-2"><Instagram className="w-4 h-4" /> Instagram</button>
              </div>

              <div className="mt-4 rounded-[12px] bg-emerald-500/10 border border-emerald-500/20 p-3 text-[11px] leading-[1.4] text-emerald-200/70 flex gap-2">
                <QrCode className="w-4 h-4 text-emerald-300 shrink-0 mt-0.5" />
                <div><span className="font-bold text-emerald-200">Viral loop:</span> QR placeholder links to clearplus.app • Dark background • Clear+ branding • Big number • Share text: "I quit with Clear+" • Download as PNG via dataURL • Web Share API included.</div>
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
              <button onClick={addCraving} className="w-full h-12 rounded-[14px] bg-white text-black font-bold text-[13px] flex items-center justify-center gap-2"><Wind className="w-4 h-4" /> Log & Breathe</button>
            </div>
          </div>
        </div>
      )}

      {showInstallHelp && (
        <div className="fixed inset-0 z-[70] flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="absolute inset-0 bg-black/80 backdrop-blur-xl" onClick={() => setShowInstallHelp(false)} />
          <div className="relative w-full sm:max-w-[420px] rounded-t-[24px] sm:rounded-[24px] bg-[#161618] border border-white/[0.10] p-6">
            <div className="flex items-center justify-between mb-5"><h3 className="font-bold flex items-center gap-2"><Download className="w-4 h-4" /> Install Clear+</h3><button onClick={() => setShowInstallHelp(false)} className="w-8 h-8 rounded-full bg-white/[0.06] flex items-center justify-center"><X className="w-4 h-4" /></button></div>
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
