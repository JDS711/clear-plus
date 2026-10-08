import { REGIONS, CURRENCIES, validRegion, validCurrency, formatMoney } from '../lib/regions.js';
import Remodel from './Remodel';
import EditableNumberInput from './EditableNumberInput';
import { supabase, initialAuthLinkIssue } from './supabase';
import { authLinkIssue } from './authLink';
import useDeviceSessions from './useDeviceSessions';
import { FREE_GUIDED_SESSIONS, canStartGuidedBreathing, nextGuidedUseCount } from '../lib/sos.js';
import { buildSavingsProjection } from '../lib/progress.js';
import { reconcileCloudStates } from '../lib/cloud-sync.js';
import { saveCloudState, syncErrorLabel } from '../lib/cloud-store.js';
import './comic-font.css';
import { Analytics } from "@vercel/analytics/react";
import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  Wind, Heart, Clock, DollarSign, Cigarette, X, Plus, Sparkles, Flame, Activity, Brain, Settings,
  Play, Pause, RotateCcw, ShieldCheck, Leaf, Droplets, Download, Smartphone, Wallet, Crown, Lock,
  BarChart3, Gift, Plane, Milk, ShoppingBag, BookOpen, Phone, Info, Zap, TrendingUp,
  PiggyBank, Check, Star, Quote, Menu, LayoutDashboard, NotebookPen, Trophy, LifeBuoy, ArrowRight,
  MapPin, Upload, Share2, Instagram, Facebook, ExternalLink, QrCode, Copy, ChevronDown, Users, TimerReset,
  BadgeCheck, Rocket, Eye, MousePointerClick, Cloud, LogOut, Mail
} from 'lucide-react';

type Craving = { id: string; time: Date; intensity: number; trigger: string; passed: boolean; note?: string };
type JournalEntry = { id: string; date: Date; mood: 'great' | 'ok' | 'tough'; text: string };
type Toast = { id: string; title: string; body: string };
type Tab = 'analytics' | 'dashboard' | 'sos' | 'journal' | 'rewards' | 'settings';
type Mode = 'landing' | 'app';
type ShareType = 'money' | 'days';
type AppTheme = 'green' | 'warm' | 'rose' | 'blue';
type DisplayMode = 'light' | 'night';
type TextSize = 'standard' | 'large';
type AppFont = 'segoe' | 'arial' | 'verdana' | 'trebuchet' | 'georgia' | 'times' | 'comic' | 'courier' | 'calibri' | 'tahoma';
type SyncStatus = 'local' | 'loading' | 'synced' | 'saving' | 'error';

const THEME_OPTIONS: Array<{ id: AppTheme; label: string; swatch: string }> = [
  { id: 'green', label: 'Green', swatch: '#70b58a' },
  { id: 'warm', label: 'Yellow orange', swatch: '#e4ad4f' },
  { id: 'rose', label: 'Pink red', swatch: '#dd7f8a' },
  { id: 'blue', label: 'Blue grey', swatch: '#789fb8' },
];
const SYSTEM_THEME_COLORS: Record<AppTheme, Record<DisplayMode, string>> = {
  green: { light: '#3f8159', night: '#4f9568' },
  warm: { light: '#9b6622', night: '#a9742f' },
  rose: { light: '#9e4a56', night: '#a95460' },
  blue: { light: '#486f86', night: '#557f97' },
};
const SYSTEM_CANVAS_COLORS: Record<AppTheme, string> = {
  green: '#eef7f0',
  warm: '#fff5df',
  rose: '#fff0f2',
  blue: '#edf4f7',
};
const FONT_OPTIONS: Array<{ id: AppFont; label: string; stack: string }> = [
  { id: 'segoe', label: 'Segoe UI', stack: 'Segoe UI, Arial, sans-serif' },
  { id: 'arial', label: 'Arial', stack: 'Arial, sans-serif' },
  { id: 'verdana', label: 'Verdana', stack: 'Verdana, Arial, sans-serif' },
  { id: 'trebuchet', label: 'Trebuchet MS', stack: 'Trebuchet MS, Arial, sans-serif' },
  { id: 'georgia', label: 'Georgia', stack: 'Georgia, serif' },
  { id: 'times', label: 'Times New Roman', stack: 'Times New Roman, serif' },
  { id: 'comic', label: 'Comic (Comic Neue)', stack: '"Clear Comic", cursive' },
  { id: 'courier', label: 'Courier New', stack: 'Courier New, monospace' },
  { id: 'calibri', label: 'Calibri', stack: 'Calibri, Arial, sans-serif' },
  { id: 'tahoma', label: 'Tahoma', stack: 'Tahoma, Verdana, sans-serif' },
];
const TAB_ORDER: Tab[] = ['dashboard', 'sos', 'journal', 'rewards', 'analytics', 'settings'];
const tabFromHash = (): Tab => {
  const hash = window.location.hash.slice(1);
  if (hash === 'progress') return 'analytics';
  return TAB_ORDER.includes(hash as Tab) ? hash as Tab : 'dashboard';
};
const hashForTab = (tab: Tab) => tab === 'analytics' ? 'progress' : tab;

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
  const [settingsUpdatedAt, setSettingsUpdatedAt] = useState(() => {
    try { return Number(localStorage.getItem('clear_settingsUpdatedAt')) || 0; } catch { return 0; }
  });
  const markSettingsChanged = () => setSettingsUpdatedAt(previous => Math.max(Date.now(), previous + 1));
  useEffect(() => { try { localStorage.setItem('clear_settingsUpdatedAt', String(settingsUpdatedAt)); } catch {} }, [settingsUpdatedAt]);

  const [region, setRegionRaw] = useState(() => {
    try { return validRegion(localStorage.getItem('clear_region')); } catch { return 'AU'; }
  });
  const [currency, setCurrencyRaw] = useState(() => {
    try { return validCurrency(localStorage.getItem('clear_currency'), validRegion(localStorage.getItem('clear_region'))); } catch { return 'AUD'; }
  });
  const support = REGIONS[region];
  const money = (value: number) => formatMoney(value, currency, region, 0);
  const verifyPurchase = async (sessionId: string) => {
    const { data } = await supabase.auth.getSession();
    if (!data.session) return { paid: false, needsSignIn: true, billing: undefined, temporary: false };
    const response = await fetch('/api/verify-checkout?session_id=' + encodeURIComponent(sessionId), {
      headers: { Authorization: 'Bearer ' + data.session.access_token },
    });
    if (response.status >= 500) return { paid: false, temporary: true, needsSignIn: false, billing: undefined };
    return response.json();
  };
  useEffect(() => {
    try { localStorage.setItem('clear_region', region); localStorage.setItem('clear_currency', currency); } catch {}
  }, [region, currency]);

  const [quitDateRevision, setQuitDateRevision] = useState(() => {
    try { const value = Number(localStorage.getItem('clear_quitDateRevision')); return Number.isSafeInteger(value) && value >= 0 ? value : 0; } catch { return 0; }
  });
  const [quitDateEditId, setQuitDateEditId] = useState(() => {
    try { return localStorage.getItem('clear_quitDateEditId') || ''; } catch { return ''; }
  });
  const latestCloudStateRef = useRef<Record<string, any>>({});
  useEffect(() => {
    try { localStorage.setItem('clear_quitDateRevision', String(quitDateRevision)); localStorage.setItem('clear_quitDateEditId', quitDateEditId); } catch {}
  }, [quitDateRevision, quitDateEditId]);
  const [quitDate, setQuitDateRaw] = useState<Date | null>(() => {
    try {
      const stored = localStorage.getItem('clear_quitDate');
      const date = stored ? new Date(stored) : null;
      if (date && Number.isFinite(date.getTime())) return date;
    } catch {}
    return null;
  });
  const [cigsPerDay, setCigsPerDayRaw] = useState(() => {
    try { const v = localStorage.getItem('clear_cigsPerDay'); return v ? parseInt(v) : 20; } catch { return 20; }
  });
  const [costPerPack, setCostPerPackRaw] = useState(() => {
    try { const v = localStorage.getItem('clear_costPerPack'); return v ? parseFloat(v) : 50; } catch { return 50; }
  });
  const [packSize, setPackSizeRaw] = useState(() => {
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
  const [activeTab, setActiveTabState] = useState<Tab>(() => tabFromHash());
  const setActiveTab = (tab: Tab) => {
    setActiveTabState(tab);
    window.history.replaceState(null, '', `${window.location.pathname}${window.location.search}#${hashForTab(tab)}`);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };
  const [showPaywall, setShowPaywall] = useState(false);
  const [paywallFeature, setPaywallFeature] = useState('Premium Analytics');
  const [billing, setBilling] = useState<'monthly' | 'yearly' | 'lifetime'>('yearly');
  const [appTheme, setAppThemeRaw] = useState<AppTheme>(() => {
    try {
      const value = localStorage.getItem('clear_theme') as AppTheme | null;
      return THEME_OPTIONS.some(option => option.id === value) ? value! : 'green';
    } catch { return 'green'; }
  });
  const [appFont, setAppFontRaw] = useState<AppFont>(() => {
    try {
      const value = localStorage.getItem('clear_font') as AppFont | null;
      return FONT_OPTIONS.some(option => option.id === value) ? value! : 'segoe';
    } catch { return 'segoe'; }
  });
  const [displayMode, setDisplayModeRaw] = useState<DisplayMode>(() => {
    try { return localStorage.getItem('clear_displayMode') === 'night' ? 'night' : 'light'; }
    catch { return 'light'; }
  });
  const [textSize, setTextSizeRaw] = useState<TextSize>(() => {
    try { return localStorage.getItem('clear_textSize') === 'large' ? 'large' : 'standard'; }
    catch { return 'standard'; }
  });

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
  const [cravingLogOutcome, setCravingLogOutcome] = useState<'logged' | 'beaten'>('logged');
  const [journalText, setJournalText] = useState('');
  const [journalMood, setJournalMood] = useState<JournalEntry['mood']>('ok');
  const [breathPhase, setBreathPhase] = useState<'inhale' | 'hold' | 'exhale' | 'rest'>('inhale');
  const [breathRunning, setBreathRunning] = useState(false);
  const [breathSessionActive, setBreathSessionActive] = useState(false);
  const [breathCount, setBreathCount] = useState(0);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [sosUses, setSosUses] = useState(() => {
    try { const raw = localStorage.getItem('clear_sosUses'); if (raw) { const o = JSON.parse(raw); if (o.date === new Date().toDateString()) return o.count; } } catch {}
    return 0;
  });
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [showSuccessCelebration, setShowSuccessCelebration] = useState(false);
  // The fabricated "community saved" counter was removed deliberately. It was never
  // rendered, and no such aggregate exists. Do not reintroduce invented social proof.
  const [referral, setReferral] = useState<string>('');
  const { user, pendingUser, admission, error: deviceError, busy: deviceBusy, signOutDevice, retryAdmission, replaceDevice } = useDeviceSessions();
  const [authEmail, setAuthEmail] = useState('');
  const [authLinkNotice, setAuthLinkNotice] = useState(initialAuthLinkIssue);
  const [authBusy, setAuthBusy] = useState(false);
  const [cloudReady, setCloudReady] = useState(false);
  const [syncStatus, setSyncStatus] = useState<SyncStatus>('local');
  const [syncRequest, setSyncRequest] = useState(0);
  const [syncError, setSyncError] = useState('');
  const lastSyncedStateRef = useRef('');
  const [premiumSession, setPremiumSession] = useState(() => {
    try { return localStorage.getItem('clear_premium_session') || ''; } catch { return ''; }
  });

  // Share modal
  const [showShare, setShowShare] = useState(false);
  const [shareType, setShareType] = useState<ShareType>('money');
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const swipeStartRef = useRef<{ x: number; y: number } | null>(null);
  const lastWheelNavRef = useRef(0);

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

  const setRegion = (value: string) => { markSettingsChanged(); setRegionRaw(value); };
  const setCurrency = (value: string) => { markSettingsChanged(); setCurrencyRaw(value); };
  const setQuitDate = (value: Date | null) => {
    if (value && !Number.isFinite(value.getTime())) return;
    const revision = Math.max(quitDateRevision, Number(latestCloudStateRef.current.quitDateRevision) || 0) + 1;
    const editId = crypto.randomUUID();
    // Update the ref immediately: an older in-flight cloud response may finish before React re-renders.
    latestCloudStateRef.current = { ...latestCloudStateRef.current, quitDate: value?.toISOString() || null, quitDateRevision: revision, quitDateEditId: editId };
    markSettingsChanged(); setQuitDateRevision(revision); setQuitDateEditId(editId); setQuitDateRaw(value);
  };
  const setCigsPerDay = (value: number) => { markSettingsChanged(); setCigsPerDayRaw(value); };
  const setCostPerPack = (value: number) => { markSettingsChanged(); setCostPerPackRaw(value); };
  const setPackSize = (value: number) => { markSettingsChanged(); setPackSizeRaw(value); };
  const setAppTheme = (value: AppTheme) => { markSettingsChanged(); setAppThemeRaw(value); };
  const setAppFont = (value: AppFont) => { markSettingsChanged(); setAppFontRaw(value); };
  const setDisplayMode = (value: DisplayMode) => { markSettingsChanged(); setDisplayModeRaw(value); };
  const setTextSize = (value: TextSize) => { markSettingsChanged(); setTextSizeRaw(value); };

  const cloudState = useMemo(() => ({
    version: 5,
    quitDateRevision,
    quitDateEditId,
    settingsUpdatedAt,
    region,
    currency,
    quitDate: quitDate?.toISOString() || null,
    cigsPerDay,
    costPerPack,
    packSize,
    sosUses,
    cravings: cravings.map(craving => ({ ...craving, time: craving.time.toISOString() })),
    journals: journals.map(journal => ({ ...journal, date: journal.date.toISOString() })),
    referral,
    appTheme,
    appFont,
    displayMode,
    textSize,
    premiumSession: premiumSession || null,
  }), [quitDateRevision, quitDateEditId, settingsUpdatedAt, region, currency, quitDate, cigsPerDay, costPerPack, packSize, sosUses, cravings, journals, referral, appTheme, appFont, displayMode, textSize, premiumSession]);

  latestCloudStateRef.current = cloudState;

  const applyCloudState = (incoming: Record<string, any>) => {
    // Keep edits made while the network request was in flight, rather than applying its stale snapshot.
    const state = reconcileCloudStates(latestCloudStateRef.current, incoming);
    latestCloudStateRef.current = state;
    setQuitDateRevision(state.quitDateRevision);
    setQuitDateEditId(state.quitDateEditId);
    setSettingsUpdatedAt(Number(state.settingsUpdatedAt) || 0);
    if (state.region) setRegionRaw(validRegion(state.region));
    if (state.currency) setCurrencyRaw(validCurrency(state.currency, state.region || region));
    const syncedQuitDate = state.quitDate ? new Date(state.quitDate) : null;
    if (!syncedQuitDate || Number.isFinite(syncedQuitDate.getTime())) setQuitDateRaw(syncedQuitDate);
    if (Number.isFinite(state.cigsPerDay)) setCigsPerDayRaw(Math.max(1, state.cigsPerDay));
    if (Number.isFinite(state.costPerPack)) setCostPerPackRaw(Math.max(0, state.costPerPack));
    if (Number.isFinite(state.packSize)) setPackSizeRaw(Math.max(1, state.packSize));
    if (Number.isFinite(state.sosUses)) setSosUses(Math.max(0, state.sosUses));
    if (typeof state.referral === 'string') setReferral(state.referral);
    if (THEME_OPTIONS.some(option => option.id === state.appTheme)) setAppThemeRaw(state.appTheme);
    if (FONT_OPTIONS.some(option => option.id === state.appFont)) setAppFontRaw(state.appFont);
    if (state.displayMode === 'light' || state.displayMode === 'night') setDisplayModeRaw(state.displayMode);
    if (state.textSize === 'standard' || state.textSize === 'large') setTextSizeRaw(state.textSize);

    if (Array.isArray(state.cravings)) {
      setCravings(state.cravings.flatMap((item: any) => {
        const time = new Date(item.time);
        return item?.id && Number.isFinite(time.getTime()) ? [{ ...item, time }] : [];
      }));
    }
    if (Array.isArray(state.journals)) {
      setJournals(state.journals.flatMap((item: any) => {
        const date = new Date(item.date);
        return item?.id && Number.isFinite(date.getTime()) ? [{ ...item, date }] : [];
      }));
    }
    if (typeof state.premiumSession === 'string' && state.premiumSession) setPremiumSession(state.premiumSession);
  };

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
      localStorage.setItem('clear_sosUses', JSON.stringify({ date: new Date().toDateString(), count: sosUses }));
      localStorage.setItem('clear_mode', mode);
      localStorage.setItem('clear_theme', appTheme);
      localStorage.setItem('clear_font', appFont);
      localStorage.setItem('clear_displayMode', displayMode);
      localStorage.setItem('clear_textSize', textSize);
      if (referral) localStorage.setItem('clear_referral', referral);
    } catch {}
  }, [quitDate, cigsPerDay, costPerPack, packSize, sosUses, mode, referral, appTheme, appFont, displayMode, textSize]);

  useEffect(() => {
    const colour = SYSTEM_THEME_COLORS[appTheme][displayMode];
    const canvas = displayMode === 'night' ? '#181a1e' : SYSTEM_CANVAS_COLORS[appTheme];
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', colour);
    document.querySelector('meta[name="apple-mobile-web-app-status-bar-style"]')?.setAttribute('content', displayMode === 'night' ? 'black-translucent' : 'default');
    document.documentElement.style.setProperty('background-color', canvas, 'important');
    document.body.style.setProperty('background-color', canvas, 'important');
  }, [appTheme, displayMode]);

  useEffect(() => {
    try { localStorage.setItem('clear_cravings', JSON.stringify(cravings)); } catch {}
  }, [cravings]);

  useEffect(() => {
    try { localStorage.setItem('clear_journals', JSON.stringify(journals)); } catch {}
  }, [journals]);

  useEffect(() => {
    try {
      if (premiumSession) localStorage.setItem('clear_premium_session', premiumSession);
      else localStorage.removeItem('clear_premium_session');
    } catch {}
  }, [premiumSession]);

  useEffect(() => {
    let cancelled = false;
    setIsPremium(false);
    if (user && premiumSession) {
      verifyPurchase(premiumSession).then(result => {
        if (cancelled) return;
        setIsPremium(!!result.paid);
        if (result.paid && result.billing) setBilling(result.billing);
      }).catch(() => {});
    }
    return () => { cancelled = true; };
  }, [user?.id, premiumSession]);

  useEffect(() => {
    if (!user) { setCloudReady(false); setSyncStatus('local'); lastSyncedStateRef.current = ''; return; }
    let cancelled = false;
    setCloudReady(false); setSyncStatus('loading'); setSyncError('');
    const loadCloudState = async () => {
      try {
        const { data, error } = await supabase.from('user_state').select('state').eq('user_id', user.id).maybeSingle();
        if (cancelled) return;
        if (error) { setSyncError(syncErrorLabel(error)); setSyncStatus('error'); return; }
        const remote = data?.state as Record<string, any> | undefined;
        const merged = reconcileCloudStates(latestCloudStateRef.current, remote || {});
        const result = JSON.stringify(merged) === JSON.stringify(remote)
          ? { state: merged }
          : await saveCloudState(supabase, user.id, merged, { cancelled: () => cancelled });
        if (cancelled || result.cancelled) return;
        if (result.error) { setSyncError(syncErrorLabel(result.error)); setSyncStatus('error'); return; }
        lastSyncedStateRef.current = JSON.stringify(result.state);
        applyCloudState(result.state);
        setCloudReady(true); setSyncStatus(JSON.stringify(latestCloudStateRef.current) === lastSyncedStateRef.current ? 'synced' : 'saving');
      } catch { if (!cancelled) { setSyncError(syncErrorLabel(null)); setSyncStatus('error'); } }
    };
    loadCloudState();
    return () => { cancelled = true; };
  }, [user?.id, syncRequest]);

  useEffect(() => {
    if (!user || !cloudReady || JSON.stringify(cloudState) === lastSyncedStateRef.current) return;
    let cancelled = false;
    setSyncStatus('saving'); setSyncError('');
    const timer = window.setTimeout(async () => {
      try {
        const result = await saveCloudState(supabase, user.id, latestCloudStateRef.current, { cancelled: () => cancelled });
        if (cancelled || result.cancelled) return;
        if (result.error) { setSyncError(syncErrorLabel(result.error)); setSyncStatus('error'); return; }
        lastSyncedStateRef.current = JSON.stringify(result.state);
        if (JSON.stringify(result.state) !== JSON.stringify(latestCloudStateRef.current)) applyCloudState(result.state);
        setSyncStatus(JSON.stringify(latestCloudStateRef.current) === lastSyncedStateRef.current ? 'synced' : 'saving');
      } catch { if (!cancelled) { setSyncError(syncErrorLabel(null)); setSyncStatus('error'); } }
    }, 650);
    return () => { cancelled = true; window.clearTimeout(timer); };
  }, [user?.id, cloudReady, cloudState]);

  useEffect(() => {
    if (!user) return;
    const refresh = () => { if (document.visibilityState === 'visible') setSyncRequest(request => request + 1); };
    const interval = window.setInterval(refresh, 15000);
    window.addEventListener('focus', refresh);
    window.addEventListener('online', refresh);
    document.addEventListener('visibilitychange', refresh);
    return () => {
      window.clearInterval(interval);
      window.removeEventListener('focus', refresh);
      window.removeEventListener('online', refresh);
      document.removeEventListener('visibilitychange', refresh);
    };
  }, [user?.id]);

  useEffect(() => {
    const onHashChange = () => {
      setActiveTabState(tabFromHash());
      const issue = authLinkIssue(window.location.href);
      if (issue) setAuthLinkNotice(issue);
    };
    window.addEventListener('hashchange', onHashChange);
    if (!window.location.hash) {
      window.history.replaceState(null, '', `${window.location.pathname}${window.location.search}#dashboard`);
    }
    return () => window.removeEventListener('hashchange', onHashChange);
  }, []);

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
        if (utmObj.ref) setReferral(utmObj.ref);
        else if (utmObj.utm_source) setReferral(`${utmObj.utm_source}/${utmObj.utm_medium || 'organic'}`);
        localStorage.setItem('clear_utm', JSON.stringify(utmObj));
      } else {
        const r = localStorage.getItem('clear_referral'); if (r) setReferral(r);
      }
      const sessionId = p.get('session_id');

      if (sessionId) {
        setPremiumSession(sessionId);
        p.delete('session_id');
        window.history.replaceState(null, '', window.location.pathname + (p.toString() ? '?' + p.toString() : '') + window.location.hash);
        // Straight after payment. Verify with Stripe, then REMEMBER THE SESSION ID — that is the
        // credential every future load re-checks. No boolean is stored.
        verifyPurchase(sessionId).then(data => {
          if (data.paid) {
            setIsPremium(true); setBilling(data.billing); setShowSuccessCelebration(true);
            setPremiumSession(sessionId);
          } else {
            pushToast({ title: data.needsSignIn ? 'Sign in to restore Premium' : 'Payment not confirmed', body: data.needsSignIn ? 'Use the email on your payment receipt in Settings.' : 'Please check your payment receipt and retry.' });
          }
        }).catch(() => pushToast({ title: 'Unable to verify payment', body: 'Keep your receipt and retry this page.' }));
      } else {
        // Every other load: re-verify the stored session against Stripe.
        //
        // This is the fix. A hand-written `clear_isPremium` now accomplishes nothing — that key is
        // never read — and a cancelled or refunded subscription loses access here, instead of
        // keeping it forever.
        const storedSession = premiumSession;

        if (storedSession) {
          verifyPurchase(storedSession).then(data => {
            setIsPremium(!!data.paid);
            if (data.paid && data.billing) setBilling(data.billing);
            // Drop a credential Stripe no longer honours, so we stop re-checking a dead session.
            if (!data.paid && !data.needsSignIn && !data.temporary) setPremiumSession('');
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

  const pushToast = (t: Omit<Toast, 'id'>) => { const id = Date.now().toString() + Math.random().toString(16).slice(2); setToasts(p => [...p.slice(-3), { ...t, id }]); setTimeout(() => setToasts(p => p.filter(x => x.id !== id)), 4000); };
  const openPaywall = (feature: string) => { setPaywallFeature(feature); setShowPaywall(true); };
  const sendSignInLink = async () => {
    const email = authEmail.trim();
    setAuthLinkNotice('');
    if (!email) return;
    setAuthBusy(true);
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: `${window.location.origin}/#settings`, shouldCreateUser: true },
    });
    setAuthBusy(false);
    if (error) {
      pushToast({ title: 'Sign-in link failed', body: error.message });
      return;
    }
    pushToast({ title: 'Check your email', body: 'Open the Clear+ sign-in link on this device.' });
  };
  const signOut = async () => {
    setIsPremium(false);
    await signOutDevice();
    setCloudReady(false);
    setSyncStatus('local');
    pushToast({ title: 'Sign-out requested', body: 'Your local progress is still on this device.' });
  };

  const restorePremium = async () => {
    const { data } = await supabase.auth.getSession();
    if (!data.session) { pushToast({ title: 'Sign in first', body: 'Use the email on your Stripe receipt.' }); return; }
    try {
      const response = await fetch('/api/restore-access', { headers: { Authorization: 'Bearer ' + data.session.access_token } });
      const result = await response.json();
      if (!response.ok) throw new Error();
      if (result.paid && result.sessionId) {
        setPremiumSession(result.sessionId); setIsPremium(true); setBilling(result.billing);
        pushToast({ title: 'Premium restored', body: 'Your purchase was verified with Stripe.' });
      } else { pushToast({ title: 'No active purchase found', body: 'Check that you signed in with your purchase email. Older purchases may need support.' }); }
    } catch { pushToast({ title: 'Restore unavailable', body: 'Your purchase has not been removed. Please try again later.' }); }
  };

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
  const achievements = [
    { label: '24 hours', done: days >= 1, icon: '🔥' },
    { label: '3 days', done: days >= 3, icon: '🌿' },
    { label: '1 week', done: days >= 7, icon: '💪' },
    { label: `${money(500)} saved`, done: moneySaved >= 500, icon: '💰' },
    { label: '100 avoided', done: cigsAvoided >= 100, icon: '🚭' },
    { label: '5 cravings beaten', done: cravingsPassed >= 5, icon: '🏆' },
    { label: `${money(1000)} saved`, done: moneySaved >= 1000, icon: '🎯' },
    { label: '1 month', done: days >= 30, icon: '🌟' },
  ];
  const achievementsEarned = achievements.filter(achievement => achievement.done).length;

  const savingsChartData = useMemo(() => {
    const arr = buildSavingsProjection(days, hours, dailyCost);
    const max = Math.max(...arr.map(a => a.saved), yearlyCost / 12);
    return { points: arr, max: max * 1.1, todayIndex: arr.findIndex(point => point.kind === 'today') };
  }, [days, hours, dailyCost, yearlyCost]);

  const addCraving = () => {
    const wasBeaten = cravingLogOutcome === 'beaten';
    const c: Craving = { id: Date.now().toString(), time: new Date(), intensity: cravingIntensity, trigger: cravingTrigger, passed: wasBeaten, note: cravingNote.trim() || undefined };
    const next = [c, ...cravings];
    try { localStorage.setItem('clear_cravings', JSON.stringify(next)); } catch {}
    setCravings(next);
    setShowCravingForm(false);
    setCravingNote('');
    setCravingLogOutcome('logged');
    pushToast({
      title: wasBeaten ? 'Craving beaten and logged 💪' : 'Craving logged',
      body: user ? 'Saved and syncing to your account.' : 'Saved on this device.',
    });
  };
  const resetBreathing = () => {
    setBreathRunning(false);
    setBreathSessionActive(false);
    setBreathCount(0);
    setBreathPhase('inhale');
  };
  const toggleBreathing = () => {
    if (breathRunning) {
      setBreathRunning(false);
      return;
    }
    if (!breathSessionActive) {
      if (!canStartGuidedBreathing(isPremium, sosUses)) {
        openPaywall('Unlimited guided breathing');
        return;
      }
      setSosUses(uses => nextGuidedUseCount(isPremium, uses));
      setBreathSessionActive(true);
      setBreathCount(0);
      setBreathPhase('inhale');
    }
    setBreathRunning(true);
  };
  const beatCurrentCraving = () => {
    resetBreathing();
    setShowSOSFull(false);
    setCravingLogOutcome('beaten');
    setShowCravingForm(true);
  };
  useEffect(() => {
    if (activeTab !== 'sos' && !showSOSFull) resetBreathing();
    // Reset only when leaving the breathing experience.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, showSOSFull]);
  const addJournal = () => {
    if (!journalText.trim()) return;
    const next = [{ id: Date.now().toString(), date: new Date(), mood: journalMood, text: journalText.trim() }, ...journals];
    try { localStorage.setItem('clear_journals', JSON.stringify(next)); } catch {}
    setJournals(next);
    setJournalText('');
    pushToast({ title: 'Journal saved', body: user ? 'Saved and syncing to your account.' : 'Saved on this device.' });
    setActiveTab('dashboard');
  };

  const handleCheckout = async (plan: 'monthly' | 'yearly' | 'lifetime') => {
    // Refuse a plan the server has already told us Stripe will reject, so the customer gets a
    // sentence instead of a dead end.
    if (hiddenPlanSet.has(plan)) {
      pushToast({ title: 'Plan unavailable', body: 'That plan is temporarily unavailable. The other plans are unaffected.' });
      return;
    }
    if (!user) { setShowPaywall(false); setActiveTab('settings'); pushToast({ title: 'Sign in before upgrading', body: 'This links your purchase to your account so it can be restored.' }); return; }
    try {
      const { data: auth } = await supabase.auth.getSession();
      if (!auth.session) throw new Error('Sign in again');
      pushToast({ title: 'Opening secure checkout', body: 'Review your plan in Stripe before paying.' });
      const res = await fetch('/api/create-checkout', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + auth.session.access_token }, body: JSON.stringify({ billing: plan }) });
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
    ctx.fillStyle = 'white'; ctx.font = '900 36px Inter, sans-serif'; ctx.fillText('Clear+', 64, 88);
    ctx.fillStyle = 'rgba(255,255,255,0.9)'; ctx.font = '800 22px Inter, sans-serif'; ctx.fillText('', 168, 84);
    ctx.fillStyle = 'rgba(255,255,255,0.35)'; ctx.font = '600 14px Inter, sans-serif'; ctx.fillText('BY A FORMER SMOKER, FOR FUTURE NON-SMOKERS', 64, 120);
    // pill
    ctx.fillStyle = 'rgba(16,185,129,0.12)'; ctx.strokeStyle = 'rgba(16,185,129,0.25)'; ctx.lineWidth = 1;
    // @ts-ignore roundRect
    if (ctx.roundRect) { ctx.beginPath(); ctx.roundRect(W - 280, 48, 216, 36, 18); ctx.fill(); ctx.stroke(); } else { ctx.fillRect(W - 280, 48, 216, 36); }
    ctx.fillStyle = '#6EE7B7'; ctx.font = '700 13px Inter'; ctx.fillText('PERSONAL ESTIMATE', W - 264, 70);
    // main number
    const mainText = shareType === 'money' ? `${money(moneySaved)}` : `${days} DAYS`;
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
    ctx.fillStyle = 'rgba(255,255,255,0.9)'; ctx.font = '700 18px Inter'; ctx.fillText('I quit with Clear+', 240, 920);
    ctx.fillStyle = 'rgba(255,255,255,0.45)'; ctx.font = '500 15px Inter'; ctx.fillText(`www.clear-plus.app • ${support.phone || support.supportName}`, 240, 948);
    ctx.fillStyle = 'rgba(255,255,255,0.25)'; ctx.font = '500 13px Inter'; ctx.fillText('Not medical advice. You got this.', 240, 972);
  };

  useEffect(() => { if (showShare) setTimeout(drawShareCanvas, 50); }, [showShare, shareType, moneySaved, days, cigsAvoided]);

  const scrollTo = (id: string) => {
    const el = document.getElementById(id);
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    setMobileNavOpen(false);
  };
  const reviewSavingsEstimate = () => {
    setActiveTab('dashboard');
    window.setTimeout(() => {
      document.getElementById('savings-calculator')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 50);
  };
  const editAssumptions = () => {
    setActiveTab('settings');
    window.setTimeout(() => {
      document.getElementById('cost-assumptions')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 50);
  };
  const moveTab = (direction: -1 | 1) => {
    const currentIndex = TAB_ORDER.indexOf(activeTab);
    const nextIndex = Math.max(0, Math.min(TAB_ORDER.length - 1, currentIndex + direction));
    if (nextIndex !== currentIndex) setActiveTab(TAB_ORDER[nextIndex]);
  };
  useEffect(() => {
    const handleArrowNavigation = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      if (target?.closest('input, textarea, select, button, a, [role="slider"], [contenteditable="true"]')) return;
      if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return;
      event.preventDefault();
      moveTab(event.key === 'ArrowRight' ? 1 : -1);
    };
    window.addEventListener('keydown', handleArrowNavigation);
    return () => window.removeEventListener('keydown', handleArrowNavigation);
    // Rebind with the current section.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab]);
  const handleWheelNavigation = (event: React.WheelEvent) => {
    const target = event.target as HTMLElement;
    if (target.closest('input, textarea, select, button, a, [role="slider"], [data-no-swipe]')) return;
    if (Math.abs(event.deltaX) < 55 || Math.abs(event.deltaX) < Math.abs(event.deltaY) * 1.2) return;
    const nowMs = Date.now();
    if (nowMs - lastWheelNavRef.current < 500) return;
    lastWheelNavRef.current = nowMs;
    moveTab(event.deltaX > 0 ? 1 : -1);
  };
  const handleTouchStart = (event: React.TouchEvent) => {
    const touch = event.touches[0];
    const target = event.target as HTMLElement;
    const interactive = target.closest('input, textarea, select, button, a, [role="slider"], [data-no-swipe]');
    const edgeGesture = touch.clientX < 24 || touch.clientX > window.innerWidth - 24;
    swipeStartRef.current = interactive || edgeGesture ? null : { x: touch.clientX, y: touch.clientY };
  };
  const handleTouchEnd = (event: React.TouchEvent) => {
    const start = swipeStartRef.current;
    swipeStartRef.current = null;
    if (!start) return;
    const touch = event.changedTouches[0];
    const dx = touch.clientX - start.x;
    const dy = touch.clientY - start.y;
    if (Math.abs(dx) < 70 || Math.abs(dx) < Math.abs(dy) * 1.25) return;
    moveTab(dx < 0 ? 1 : -1);
  };

  const enterApp = (refSource?: string) => {
    if (refSource) setReferral(refSource);
    setMode('app');
    window.scrollTo({ top: 0, behavior: 'smooth' });
    try { localStorage.setItem('clear_mode', 'app'); } catch {}
  };

  // === RENDER ===
  return (
    <div
      className="clear-shell min-h-screen bg-[#070708] text-white selection:bg-white/20 flex flex-col relative"
      data-theme={appTheme}
      data-display-mode={displayMode}
      data-text-size={textSize}
      style={{ '--app-font': FONT_OPTIONS.find(option => option.id === appFont)?.stack } as React.CSSProperties}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      onWheel={handleWheelNavigation}
    >
      {/* Celebration */}
      {showSuccessCelebration && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 pointer-events-none">
          <div className="pointer-events-auto rounded-[28px] bg-[#121214] border border-emerald-500/30 p-8 text-center shadow-[0_30px_100px_rgba(0,0,0,0.9)] max-w-[420px] w-full">
            <div className="w-16 h-16 rounded-full bg-emerald-500 app-readable-text flex items-center justify-center mx-auto mb-4"><Crown className="w-8 h-8" /></div>
            <div className="text-[22px] font-[900]">You're now Clear+ 🎉</div>
            <div className="text-[13px] text-white/60 mt-2 leading-[1.5]">Premium unlocked. Unlimited SOS, analytics, progress tools. Thanks for supporting free quitters.</div>
            <button onClick={() => setShowSuccessCelebration(false)} className="mt-5 h-11 px-6 rounded-full bg-white app-readable-text font-bold text-[13px]">Let's go</button>
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
          <header className="app-header relative z-30 h-[68px] flex items-center justify-between px-4 lg:px-7 border-b border-white/[0.06] backdrop-blur-2xl sticky top-0">
            <div className="flex items-center gap-4">
              <button aria-label="Clear+ dashboard" onClick={() => { setActiveTab('dashboard') }} className="app-brand-tile w-9 h-9 rounded-[12px] flex items-center justify-center"><Wind aria-hidden="true" className="w-5 h-5" /></button>
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-[800] tracking-[-0.03em] text-[18px] leading-none">Clear+</span>

                  {isPremium && <span className="app-accent-soft hidden sm:inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full"><Crown className="w-3 h-3" /> PLUS</span>}
                  <button onClick={() => { setActiveTab('dashboard') }} className="hidden sm:flex text-[10px] px-2 py-0.5 rounded-full bg-white/[0.06] border border-white/[0.08] text-white/40 hover:text-white/70">Home</button>
                </div>
                <div className="text-[11px] text-white/40 mt-0.5 hidden sm:block tracking-wide">By a former smoker, for future non-smokers</div>
              </div>
            </div>

            <div className="hidden lg:flex items-center gap-1 p-1 rounded-full bg-white/[0.04] border border-white/[0.06]">
              {navItems.map(it => {
                const active = activeTab === it.id;
                return (
                  <button key={it.id} onClick={() => setActiveTab(it.id)} className={`h-8 px-4 rounded-full text-[12px] font-medium flex items-center gap-1.5 transition ${active ? 'bg-white app-readable-text shadow' : 'text-white/50 hover:text-white/80 hover:bg-white/[0.06]'}`}>
                    <it.icon className="w-3.5 h-3.5" />{it.label}{!it.free && !isPremium && <Lock className="w-3 h-3 opacity-60" />}
                  </button>
                );
              })}
            </div>

            <div className="flex items-center gap-2">
              <div className="hidden sm:flex items-center gap-2 px-3 h-8 rounded-full bg-white/[0.06] border border-white/[0.08]">
                <div className="app-accent-dot w-2 h-2 rounded-full animate-pulse" /><span className="text-[11px] text-white/60">LIVE</span><span className="text-[11px] font-bold">{days}d {hours}h</span>
              </div>
              {!isPremium ? (
                <button onClick={() => openPaywall('Clear+ Premium')} className="app-accent-fill h-9 px-4 rounded-full text-[12px] font-bold flex items-center gap-1.5 hover:scale-[1.02] transition">
                  <Crown className="w-4 h-4" /> Upgrade
                </button>
              ) : (
                <div className="app-accent-soft h-9 px-3 rounded-full flex items-center gap-1.5 text-[11px]"><Crown className="w-3.5 h-3.5" /> Premium</div>
              )}
              <button onClick={() => setMobileNavOpen(!mobileNavOpen)} className="lg:hidden w-9 h-9 rounded-full bg-white/[0.06] border border-white/[0.08] flex items-center justify-center"><Menu className="w-4 h-4" /></button>
            </div>
          </header>

          {mobileNavOpen && (
            <div className="lg:hidden relative z-20 bg-[#0e0e10] border-b border-white/[0.06] px-4 py-3 flex gap-2 overflow-x-auto">
              {navItems.map(it => (
                <button key={it.id} onClick={() => { setActiveTab(it.id); setMobileNavOpen(false); }} className={`shrink-0 h-9 px-4 rounded-full text-[13px] font-medium border flex items-center gap-1.5 ${activeTab === it.id ? 'bg-white app-readable-text border-white' : 'bg-white/[0.04] border-white/[0.08] text-white/60'}`}>
                  <it.icon className="w-4 h-4" />{it.label}
                </button>
              ))}
            </div>
          )}

          <main key={activeTab} className="tab-panel relative z-10 flex-1 w-full max-w-[1280px] mx-auto px-4 lg:px-7 py-6">
            {authLinkNotice && <div className="auth-link-notice" role="alert"><p>{authLinkNotice}</p><button type="button" onClick={() => { setAuthLinkNotice(''); setActiveTab('settings'); }} className="min-h-11 rounded-xl border px-4 mt-2">Go to sign-in settings</button></div>}

            {activeTab === 'dashboard' && <Remodel region={region} currency={currency} signedIn={!!user} quitDate={quitDate} setQuitDate={setQuitDate} now={now} cigs={cigsPerDay} pack={packSize} price={costPerPack} setCigs={setCigsPerDay} setPack={setPackSize} setPrice={setCostPerPack} onEditAssumptions={editAssumptions} onLog={() => { setCravingLogOutcome('logged'); setShowCravingForm(true); }} onJournal={() => setActiveTab('journal')} onAnalytics={() => setActiveTab('analytics')} onShare={() => setShowShare(true)} isPremium={isPremium} onUpgrade={() => openPaywall('Clear+ Premium')} />}
            {activeTab === 'analytics' && (
                <div className="lg:col-span-5 space-y-6">
                  {/* Premium Analytics */}
                  <div className="rounded-[24px] bg-[#121214] border border-white/[0.06] overflow-hidden relative">
                    <div className="p-5 flex items-center justify-between">
                      <div className="flex items-center gap-2"><div data-premium-accent="analytics" className="app-accent-soft premium-accent-tile w-7 h-7 rounded-[9px] flex items-center justify-center"><BarChart3 className="app-accent-icon w-4 h-4" /></div><h2 className="text-[12px] tracking-[0.14em] font-bold text-white/30 uppercase">Premium Analytics</h2></div>
                      {!isPremium && <span data-premium-accent="locked" className="app-accent-soft premium-accent-tile text-[10px] px-2 py-1 rounded-full flex items-center gap-1"><Lock className="app-accent-icon w-3 h-3" /> LOCKED</span>}
                    </div>
                    <div className="relative">
                      <div className={`${!isPremium ? 'blur-[8px] pointer-events-none select-none' : ''} px-5 pb-5 space-y-5`}>
                        <div className="rounded-[16px] bg-[#0f0f10] border border-white/[0.06] p-4">
                          <div className="flex items-center justify-between mb-3"><span className="text-[11px] font-bold tracking-widest uppercase text-white/30">Cumulative Savings</span><span className="text-[11px] text-emerald-300 font-bold">{money(moneySaved)} total</span></div>
                          <div className="h-[110px] w-full relative">
                            <svg viewBox="0 0 300 100" className="w-full h-full">
                              <defs><linearGradient id="g2" x1="0" x2="0" y1="0" y2="1"><stop offset="0%" stopColor="var(--theme-accent)" stopOpacity="0.4" /><stop offset="100%" stopColor="var(--theme-accent)" stopOpacity="0" /></linearGradient></defs>
                              {(() => {
                                const pts = savingsChartData.points;
                                const max = savingsChartData.max || 1;
                                const path = pts.map((p, i) => `${i === 0 ? 'M' : 'L'} ${(i / (pts.length - 1)) * 280 + 10} ${90 - (p.saved / max) * 80}`).join(' ');
                                const area = path + ` L ${(pts.length - 1) / (pts.length - 1) * 280 + 10} 90 L 10 90 Z`;
                                const todayX = (savingsChartData.todayIndex / (pts.length - 1)) * 280 + 10;
                                return <><path d={area} fill="url(#g2)" /><path d={path} fill="none" stroke="var(--theme-accent)" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" /><line x1={todayX} x2={todayX} y1="8" y2="92" stroke="var(--theme-accent)" strokeOpacity="0.35" strokeDasharray="3 3" /></>;
                              })()}
                            </svg>
                            <div className="absolute bottom-0 left-0 right-0 flex justify-between text-[9px] text-white/20 px-2"><span>Past 14d</span><span>Today</span><span>Projected +15d</span></div>
                          </div>
                          <p className="text-[11px] text-white/40 mt-2">Solid progress through today; the right side estimates future savings if you remain smoke-free.</p>
                        </div>
                      </div>
                      {!isPremium && (
                        <div className="premium-locked-overlay absolute inset-0 flex flex-col items-center justify-end p-6 text-center">
                          <div data-premium-accent="crown" className="app-accent-soft premium-accent-tile w-12 h-12 rounded-full flex items-center justify-center mb-3"><Crown className="app-accent-icon w-6 h-6" /></div>
                          <div className="text-[15px] font-bold tracking-[-0.01em]">Unlock Premium Analytics</div>
                          <div className="text-[12px] text-white/50 mt-1 max-w-[260px] leading-[1.5]">Savings history, future projections and progress rewards. In 1 year: {money(yearlyCost)} saved.</div>
                          <button onClick={() => openPaywall('Premium Analytics')} className="mt-4 h-11 px-6 rounded-full bg-white app-readable-text font-bold text-[13px] flex items-center gap-2 hover:bg-white/90"><Crown className="w-4 h-4" /> Unlock with Clear+</button>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="rounded-[24px] bg-[#121214] border border-white/[0.06] p-5">
                    <div className="flex items-center justify-between mb-4"><h2 className="text-[12px] tracking-[0.14em] font-bold text-white/30 uppercase">Achievements</h2><span className="text-[11px] text-white/30">{achievementsEarned} of {achievements.length} earned</span></div>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      {achievements.map(achievement => (
                        <div key={achievement.label} className={`achievement-card relative min-h-[92px] rounded-[14px] border flex flex-col items-center justify-center gap-1 text-center transition ${achievement.done ? 'is-earned' : 'bg-white/[0.04] border-white/[0.06] text-white/20'}`}>
                          {achievement.done && <Check className="absolute top-2 right-2 w-3.5 h-3.5" />}
                          <span className="text-[18px]">{achievement.icon}</span><span className="text-[10px] font-bold tracking-wide">{achievement.label}</span>
                          <span className="text-[9px] uppercase tracking-wider">{achievement.done ? 'Earned' : 'In progress'}</span>
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
                      <div className="flex items-center gap-3"><div className="breathing-icon-tile app-accent-fill w-9 h-9 flex items-center justify-center"><Wind className="w-5 h-5" /></div><div><div className="text-[14px] font-bold">SOS Breathing • 4-7-8</div><div className="text-[11px] text-white/40">{isPremium ? 'Premium • Unlimited guided sessions' : `${Math.max(0, FREE_GUIDED_SESSIONS - sosUses)} of ${FREE_GUIDED_SESSIONS} free guided sessions remaining today`} • Craving logs are always free</div></div></div>
                      {!isPremium && sosUses >= FREE_GUIDED_SESSIONS && !breathSessionActive && <span className="text-[11px] px-2.5 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-300">Guided limit reached</span>}
                    </div>
                    <div className="flex flex-col items-center text-center py-6">
                      <div className="text-[11px] tracking-[0.2em] uppercase font-bold text-white/30">Round {breathCount + 1} • {breathPhase}</div>
                      <div className="mt-2 text-[26px] font-[800] capitalize">{breathPhase === 'inhale' ? 'Breathe in slowly' : breathPhase === 'hold' ? 'Hold' : breathPhase === 'exhale' ? 'Breathe out fully' : 'Rest'}</div>
                      <div className="relative w-[260px] h-[260px] flex items-center justify-center mt-8">
                        <div className={`absolute rounded-full border border-white/10 transition-all duration-[1000ms] ${breathPhase === 'inhale' ? 'w-[240px] h-[240px] bg-white/[0.06]' : breathPhase === 'hold' ? 'w-[240px] h-[240px] bg-white/[0.08]' : breathPhase === 'exhale' ? 'w-[120px] h-[120px] bg-white/[0.03]' : 'w-[160px] h-[160px] bg-white/[0.04]'}`} />
                        <div className={`breath-orb absolute rounded-full transition-all ease-in-out ${breathPhase === 'inhale' ? 'w-[200px] h-[200px] duration-[4000ms]' : breathPhase === 'hold' ? 'w-[200px] h-[200px] duration-[7000ms]' : breathPhase === 'exhale' ? 'w-[90px] h-[90px] duration-[8000ms]' : 'w-[130px] h-[130px] duration-[1000ms]'}`} />
                        <div className="breath-orb-copy relative z-10 text-center"><div className="text-[42px] font-[900] tabular-nums">{breathPhase === 'inhale' ? '4s' : breathPhase === 'hold' ? '7s' : breathPhase === 'exhale' ? '8s' : '•'}</div><div className="text-[11px] tracking-widest uppercase text-white/50 font-bold mt-1">{breathPhase}</div></div>
                      </div>
                      <div className="mt-8 flex items-center gap-3">
                        <button onClick={toggleBreathing} className="app-accent-fill h-12 px-6 rounded-full font-bold text-[13px] flex items-center gap-2">
                          {breathRunning ? <><Pause className="w-4 h-4" /> Pause</> : <><Play className="w-4 h-4" /> Start breathing</>}
                        </button>
                        <button onClick={() => { setBreathCount(0); setBreathPhase('inhale'); }} type="button" className="breathing-reset app-accent-fill h-12 flex items-center justify-center gap-2"><RotateCcw className="w-4 h-4" /> Reset</button>
                      </div>
                    </div>
                    <div className="mt-6">
                      <button onClick={beatCurrentCraving} className="app-accent-fill w-full h-12 rounded-full font-bold text-[13px] flex items-center justify-center gap-2"><Sparkles className="w-4 h-4" /> I beat the craving</button>
                    </div>
                  </div>
                </div>
                <div className="lg:col-span-5 space-y-6">
                  <div className="rounded-[24px] bg-[#121214] border border-white/[0.06] p-5">
                    <div className="flex items-center justify-between mb-4"><h2 className="text-[12px] tracking-[0.14em] font-bold text-white/30 uppercase">Craving Log</h2><span className="text-[11px] text-white/35">{cravings.length} logged</span></div>
                    <div className="space-y-2 max-h-[420px] overflow-auto pr-1">
                      {cravings.map(c => (
                        <div key={c.id} className="flex items-center gap-3 p-3 rounded-[14px] border bg-white/[0.04] border-white/[0.07]">
                          <div className="app-accent-soft min-w-[78px] h-9 px-2 rounded-[10px] flex items-center justify-center text-[11px] font-bold shrink-0">Intensity {c.intensity}/10</div>
                          <div className="flex-1 min-w-0"><div className="text-[12px] font-medium flex items-center gap-2"><span className="truncate">{c.trigger}</span><span className="text-[10px] text-white/30">• {new Date(c.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span></div>{c.note && <div className="text-[11px] text-white/40 truncate mt-0.5">{c.note}</div>}</div>
                          <span className={c.passed ? 'text-[11px] font-bold text-emerald-300' : 'text-[11px] text-white/35'}>{c.passed ? '✓ Beaten' : 'Logged'}</span>
                        </div>
                      ))}
                    </div>
                    <button onClick={() => setActiveTab('dashboard')} className="dashboard-return mt-5 w-full min-h-12 rounded-[14px] font-bold text-[14px] flex items-center justify-center gap-2"><LayoutDashboard className="w-4 h-4" /> Back to Dashboard</button>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'journal' && (
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                <div className="lg:col-span-7">
                  <div className="rounded-[24px] bg-[#121214] border border-white/[0.06] p-6">
                    <div className="flex items-center justify-between mb-5"><h2 className="text-[12px] tracking-[0.14em] font-bold text-white/30 uppercase">Journal • Reflect & Grow</h2><span className="text-[11px] text-white/30">{journals.length} entries</span></div>
                    <div className="flex gap-2 mb-4">{(['great', 'ok', 'tough'] as const).map(m => (<button key={m} onClick={() => setJournalMood(m)} className={`flex-1 h-9 rounded-full text-[11px] font-medium border capitalize transition ${journalMood === m ? 'bg-white app-readable-text border-white' : 'bg-white/[0.04] border-white/[0.06] text-white/50 hover:text-white/80'}`}>{m}</button>))}</div>
                    <div className="flex gap-2 mb-6">
                      <input value={journalText} onChange={e => setJournalText(e.target.value)} onKeyDown={e => e.key === 'Enter' && addJournal()} placeholder="How are you feeling today?" className="flex-1 h-12 px-4 rounded-[14px] bg-white/[0.06] border border-white/[0.08] text-[13px] placeholder:text-white/30 focus:outline-none focus:border-white/20" />
                      <button onClick={addJournal} className="w-12 h-12 rounded-[14px] bg-white app-readable-text flex items-center justify-center hover:bg-white/90"><Plus className="w-5 h-5" /></button>
                    </div>
                    <div className="space-y-3 max-h-[520px] overflow-auto pr-1">
                      {journals.map(j => (
                        <div key={j.id} className="p-4 rounded-[14px] bg-white/[0.04] border border-white/[0.06]">
                          <div className="flex items-center justify-between"><span className="journal-mood-label text-[10px] px-2 py-0.5 rounded-full border font-bold tracking-wide uppercase">{j.mood}</span><span className="text-[10px] text-white/30">{new Date(j.date).toLocaleDateString()}</span></div>
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
                      <div className="flex gap-2"><Heart className="app-accent-icon w-4 h-4 shrink-0 mt-0.5" /> Look back for patterns and ideas you want to try again.</div>
                    </div>
                  </div>
                  <button onClick={() => setActiveTab('dashboard')} className="dashboard-return w-full min-h-12 rounded-[14px] font-bold text-[14px] flex items-center justify-center gap-2"><LayoutDashboard className="w-4 h-4" /> Back to Dashboard</button>
                </div>
              </div>
            )}

            {activeTab === 'rewards' && (
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                <div className="lg:col-span-7 space-y-6">
                  <div className="rounded-[28px] bg-[#131315] border border-white/[0.08] overflow-hidden relative">
                    <div className="rewards-accent-wash absolute inset-0" />
                    <div className="relative p-6 lg:p-7">
                      <div className="flex items-center justify-between mb-6">
                        <div className="flex items-center gap-3"><div className="app-accent-soft w-8 h-8 rounded-[10px] flex items-center justify-center"><PiggyBank className="piggy-accent w-4 h-4" /></div><div><h2 className="text-[14px] font-bold">Pledge Jar • Your Savings, Visualized</h2><div className="text-[11px] text-white/40">Fill it with what you don't smoke.</div></div></div>
                        <button onClick={() => { setShareType('money'); setShowShare(true); }} className="h-9 px-4 rounded-full bg-white app-readable-text text-[12px] font-bold flex items-center gap-1.5"><Share2 className="w-4 h-4" /> Share</button>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-[200px_1fr] gap-6 items-end">
                        <div className="flex justify-center">
                          <div className="relative w-[160px] h-[220px] rounded-b-[28px] rounded-t-[12px] border-[3px] border-white/[0.12] bg-white/[0.03] overflow-hidden">
                            <div className="absolute top-0 left-0 right-0 h-[18px] bg-white/[0.08] border-b border-white/[0.10] flex items-center justify-center"><div className="w-10 h-1.5 rounded-full bg-white/20" /></div>
                            <div className="pledge-fill absolute bottom-0 left-0 right-0 transition-all duration-1000 flex items-end justify-center pb-2" style={{ height: `${Math.min(95, (moneySaved / (yearlyCost || 1)) * 100)}%` }}>
                            </div>
                            <span className="pledge-value absolute bottom-2 left-1/2 -translate-x-1/2 text-[10px] font-bold">{money(moneySaved)}</span>
                          </div>
                        </div>
                        <div className="space-y-4">
                          <div className="grid grid-cols-2 gap-3">
                            <div className="rounded-[14px] bg-[#0f0f10] border border-white/[0.06] p-3"><div className="text-[10px] uppercase tracking-widest font-bold text-white/30">Estimated spending avoided</div><div className="text-[20px] font-[900] mt-1">{money(moneySaved)}</div></div>
                            <div className="rounded-[14px] bg-[#0f0f10] border border-white/[0.06] p-3"><div className="text-[10px] uppercase tracking-widest font-bold text-white/30">Yearly goal</div><div className="text-[20px] font-[900] mt-1">{money(yearlyCost)}</div><div className="text-[11px] text-emerald-300">{Math.round((moneySaved / yearlyCost) * 100) || 0}% filled</div></div>
                          </div>
                          <button onClick={reviewSavingsEstimate} className="w-full h-12 rounded-[14px] bg-white app-readable-text font-bold text-[13px] flex items-center justify-center gap-2 hover:bg-white/90"><Gift className="w-4 h-4" /> Review savings estimate</button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="lg:col-span-5 space-y-6">
                  <div className="rounded-[24px] bg-gradient-to-br from-white/[0.06] to-white/[0.02] border border-white/[0.08] p-6">
                    <div className="flex items-center gap-2 mb-3"><Crown className="app-accent-icon w-4 h-4" /><h3 className="text-[13px] font-bold">Share your progress</h3></div>
                    <div className="text-[12px] leading-[1.6] text-white/50">Share your win and inspire others. 1080x1080 image with website address to www.clear-plus.app. Created on your device.</div>
                    <button onClick={() => { setShareType('money'); setShowShare(true); }} className="mt-4 w-full h-11 rounded-[12px] bg-white app-readable-text font-bold text-[13px] flex items-center justify-center gap-2"><Share2 className="w-4 h-4" /> Generate share image</button>
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
                      <div id="cost-assumptions" className="rounded-[16px] bg-white/[0.03] border border-white/[0.06] p-4">
                        <div className="text-[11px] font-bold tracking-widest uppercase text-white/30 mb-3">Country, currency & cost inputs</div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
                          <label>Country<select aria-label="Country" value={region} onChange={e => { const next = validRegion(e.target.value); setRegion(next); setCurrency(REGIONS[next].currency); }} className="block w-full min-h-11 rounded-xl p-2 app-readable-text bg-white">{Object.entries(REGIONS).map(([code, config]: [string, any]) => <option key={code} value={code}>{config.name}</option>)}</select></label>
                          <label>Savings currency<select aria-label="Savings currency" value={currency} onChange={e => setCurrency(e.target.value)} className="block w-full min-h-11 rounded-xl p-2 app-readable-text bg-white">{CURRENCIES.map(code => <option key={code} value={code}>{code}</option>)}</select></label>
                        </div>
                        <p className="text-sm mb-3">Changing currency changes the label, not the numbers. Enter your actual local pack price below. Premium checkout remains priced in AUD.</p>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                          <div><label className="text-[10px] uppercase font-bold text-white/30 mb-1.5 block">Cigarettes / day</label><EditableNumberInput aria-label="Cigarettes per day" min={1} max={200} value={cigsPerDay} onValueChange={setCigsPerDay} className="w-full h-11 px-3 rounded-[12px] bg-[#0f0f10] border border-white/[0.10] text-[13px]" /></div>
                          <div><label className="text-[10px] uppercase font-bold text-white/30 mb-1.5 block">Cigarettes / pack</label><EditableNumberInput aria-label="Cigarettes per pack" min={1} max={200} value={packSize} onValueChange={setPackSize} className="w-full h-11 px-3 rounded-[12px] bg-[#0f0f10] border border-white/[0.10] text-[13px]" /></div>
                          <div><label className="text-[10px] uppercase font-bold text-white/30 mb-1.5 block">Price / pack {currency}</label><EditableNumberInput aria-label={`Price per pack ${currency}`} min={0} max={10000} step={0.01} value={costPerPack} onValueChange={setCostPerPack} className="w-full h-11 px-3 rounded-[12px] bg-[#0f0f10] border border-white/[0.10] text-[13px]" /></div>
                        </div>
                        <div className="mt-3 grid grid-cols-5 gap-1.5">{[20, 25, 30, 40, 50].map(size => (<button key={size} onClick={() => setPackSize(size)} className={`min-h-10 rounded-[12px] text-[12px] font-bold border ${packSize === size ? 'bg-white app-readable-text border-white' : 'bg-[#0f0f10] border-white/[0.10] text-white/60'}`}>{size}</button>))}</div>
                        <p className="text-[11px] text-white/40 mt-2">Choose a common pack size or type an exact custom amount above.</p>
                      </div>
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
                        <div className="text-[11px] font-bold tracking-widest uppercase text-white/30 mb-3">Accent colour</div>
                        <div className="accent-tiles" role="group" aria-label="Accent colour">
                          {THEME_OPTIONS.map(option => (
                            <button key={option.id} type="button" className="accent-tile" aria-label={option.label} title={option.label} aria-pressed={appTheme === option.id} onClick={() => setAppTheme(option.id)} style={{ backgroundColor: option.swatch }} />
                          ))}
                        </div>
                      </div>
                      <div className="rounded-[16px] bg-white/[0.03] border border-white/[0.06] p-4">
                        <div className="text-[11px] font-bold tracking-widest uppercase text-white/30 mb-3">Display mode</div>
                        <div className="grid grid-cols-2 gap-2">
                          {(['light', 'night'] as const).map(option => (
                            <button key={option} type="button" aria-pressed={displayMode === option} onClick={() => setDisplayMode(option)} className={`min-h-11 rounded-[12px] border px-3 py-2 text-[13px] font-bold capitalize ${displayMode === option ? 'border-current bg-white/[0.10]' : 'border-white/[0.08] bg-white/[0.03]'}`}>{option}</button>
                          ))}
                        </div>
                      </div>
                      <div className="rounded-[16px] bg-white/[0.03] border border-white/[0.06] p-4">
                        <div className="text-[11px] font-bold tracking-widest uppercase text-white/30 mb-3">Text size</div>
                        <div className="grid grid-cols-2 gap-2">
                          {(['standard', 'large'] as const).map(option => (
                            <button key={option} type="button" aria-pressed={textSize === option} onClick={() => setTextSize(option)} className={`min-h-11 rounded-[12px] border px-3 py-2 text-[13px] font-bold capitalize ${textSize === option ? 'border-current bg-white/[0.10]' : 'border-white/[0.08] bg-white/[0.03]'}`}>{option}</button>
                          ))}
                        </div>
                      </div>
                      <div className="rounded-[16px] bg-white/[0.03] border border-white/[0.06] p-4">
                        <div className="text-[11px] font-bold tracking-widest uppercase text-white/30 mb-3">Font</div>
                        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                          {FONT_OPTIONS.map(option => (
                            <button
                              key={option.id}
                              type="button"
                              aria-pressed={appFont === option.id}
                              onClick={() => setAppFont(option.id)}
                              className={`min-h-11 rounded-[12px] border px-3 py-2 text-[13px] ${appFont === option.id ? 'border-current bg-white/[0.10]' : 'border-white/[0.08] bg-white/[0.03]'}`}
                              style={{ fontFamily: option.stack }}
                            >
                              {option.label}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="lg:col-span-5 space-y-6">
                  <div className="rounded-[24px] bg-[#121214] border border-white/[0.06] p-6">
                    <div className="flex items-center gap-2 mb-4"><Cloud className="w-5 h-5 text-sky-300" /><h3 className="text-[14px] font-bold">Account & sync</h3></div>
                  <p className="text-sm">Sign in using the email on your Stripe receipt to sync your progress and access your account. Free tools do not require an account.</p>

                    {user ? (
                      <div className="space-y-4">
                  <button type="button" onClick={restorePremium} className="min-h-11 rounded-xl border p-3">Restore Premium purchase</button>

                        <div className="rounded-[14px] bg-white/[0.04] border border-white/[0.06] p-4">
                          <div className="text-[11px] uppercase tracking-widest text-white/35 font-bold">Signed in as</div>
                          <div className="text-[13px] font-bold mt-1 break-all">{user.email}</div>
                          <div className="text-[11px] text-white/45 mt-2">
                            {syncStatus === 'synced' ? '✓ Progress synced' : syncStatus === 'saving' ? 'Syncing changes…' : syncStatus === 'loading' ? 'Loading your progress…' : syncStatus === 'error' ? 'Sync paused — ' + syncError : 'Stored on this device'}
                          </div>
                        </div>
                        <p className="text-[11px] text-white/45">Your quit date, settings, journals, cravings, achievements and verified premium session follow you between signed-in devices. Up to 3 devices or browsers can stay signed in at once.</p>
                        <button onClick={() => setSyncRequest(request => request + 1)} disabled={syncStatus === 'loading' || syncStatus === 'saving'} className="cloud-sync-button app-accent-fill w-full h-11 rounded-[12px] text-[12px] font-bold flex items-center justify-center gap-2"><Cloud className="w-4 h-4" /> Refresh this device from cloud</button>
                        <button onClick={signOut} className="w-full h-11 rounded-[12px] bg-white/[0.05] border border-white/[0.10] text-[12px] font-bold flex items-center justify-center gap-2"><LogOut className="w-4 h-4" /> Sign out</button>
                      </div>
                    ) : pendingUser ? (
                      <div className="space-y-3" role="status">
                        <h4 className="text-[14px] font-bold">{deviceError ? 'Device check unavailable' : admission?.revoked ? 'This device was signed out' : 'Three devices are already signed in'}</h4>
                        <p className="text-[12px]">{deviceError || (admission?.revoked ? 'Sign out here, then request a fresh email link to sign in again.' : 'Choose a device to sign out before using this one. Your cloud progress will not be deleted.')}</p>
                        {!admission?.revoked && admission?.sessions.map(device => (
                          <div key={device.id} className="rounded-xl border p-3 space-y-2">
                            <p className="text-[12px] font-bold">{device.label}</p>
                            <p className="text-[10px]">Last active: {new Date(device.lastSeen).toLocaleString()}</p>
                            <button type="button" disabled={deviceBusy} onClick={() => replaceDevice(device.id)} className="min-h-11 w-full rounded-xl border p-2">Sign out this device and use mine</button>
                          </div>
                        ))}
                        {!admission?.revoked && <button type="button" disabled={deviceBusy} onClick={retryAdmission} className="min-h-11 w-full rounded-xl border p-2">{deviceBusy ? 'Checking…' : 'Try again'}</button>}
                        <button type="button" disabled={deviceBusy} onClick={signOut} className="min-h-11 w-full rounded-xl border p-2">Sign out here</button>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        <p className="text-[12px] leading-[1.55] text-white/50">Sign in with the same email on your phone and computer, and use the same app address on both. The preview and live app have separate browser storage. No extra password required.</p>
                        <label className="text-[10px] uppercase tracking-widest font-bold text-white/35 block">Email address</label>
                        <input type="email" autoComplete="email" value={authEmail} onChange={event => setAuthEmail(event.target.value)} onKeyDown={event => { if (event.key === 'Enter') sendSignInLink(); }} placeholder="you@example.com" className="w-full h-11 px-3 rounded-[12px] bg-[#0f0f10] border border-white/[0.10] text-[13px]" />
                        <button disabled={authBusy || !authEmail.trim()} onClick={sendSignInLink} className="w-full h-11 rounded-[12px] bg-white app-readable-text font-bold text-[13px] flex items-center justify-center gap-2 disabled:opacity-50"><Mail className="w-4 h-4" /> {authBusy ? 'Sending…' : 'Email me a sign-in link'}</button>
                        <p className="text-[10px] text-white/35">Use the same email on every device. Request a fresh, single-use link on each device. Up to 3 devices or browsers can stay signed in at once.</p>
                      </div>
                    )}
                  </div>
                  <div className="rounded-[24px] bg-[#131315] border border-white/[0.08] p-6">
                    <div className="flex items-center gap-2 mb-4"><Crown className="app-accent-icon w-5 h-5" /><h3 className="text-[14px] font-bold">Subscription</h3></div>
                    {isPremium ? (
                      <div className="space-y-3">
                        <p>Premium is enabled{user ? ' and linked to your synced account' : ' in this browser'}. To manage or cancel a paid subscription, use the subscription management link in your Stripe receipt.</p>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        <div className="rounded-[14px] bg-white/[0.04] border border-white/[0.06] p-4"><div className="text-[12px] font-bold">Free tier</div><div className="text-[11px] text-white/40 mt-1">Unlimited craving logs, timer, basic savings, 3 guided breathing sessions per day, 7-day history</div></div>
                        <button onClick={() => openPaywall('Settings Upgrade')} className="w-full h-11 rounded-[12px] bg-white app-readable-text font-bold text-[13px] flex items-center justify-center gap-2"><Crown className="w-4 h-4" /> Upgrade to Clear+ from AUD $9.99/mo</button>
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
                      <button onClick={() => setShowInstallHelp(true)} className="h-10 px-3 rounded-[10px] bg-white/[0.04] border border-white/[0.06] text-[11px] text-white/50">Help</button>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </main>

          <footer className="relative z-10 border-t border-white/[0.06] mt-8 py-4 px-4 lg:px-7 flex flex-col sm:flex-row items-center justify-between gap-2 text-[11px] text-white/25">
            <div className="flex items-center gap-2"><Wind className="w-3.5 h-3.5" /> Clear+ • By a former smoker, for future non-smokers • Estimates in {currency} • {support.supportName} {support.phone} • {user ? (syncStatus === 'synced' ? 'Progress synced' : syncStatus === 'error' ? 'Progress sync paused' : 'Progress syncing') : 'Progress saved in this browser'}</div>
            <div className="flex items-center gap-3"><span className="px-2 py-1 rounded-full bg-white/[0.04] border border-white/[0.06]">{isPremium ? 'Plus • AUD $' + (billing === 'lifetime' ? '49.95 lifetime' : billing === 'yearly' ? '29.95/y Best Value' : '9.99/mo') : 'Free tier'}</span><span>{days}d smoke-free • {money(moneySaved)} saved</span></div>
          </footer>
        </>
      )}

      {showPaywall && <div className="fixed inset-0 z-[90] bg-black/60 flex items-center justify-center p-4"><section role="dialog" aria-modal="true" aria-label="Clear+ Premium" className="bg-[#fffdf8] rounded-3xl p-7 max-w-xl w-full max-h-[90vh] overflow-auto"><button className="float-right" aria-label="Close Premium" onClick={() => setShowPaywall(false)}>✕</button><h2 className="text-2xl font-bold">Clear+ Premium</h2><p className="my-4">Craving logging, the timer, calculator and five-minute pause stay free. Premium adds unlimited guided breathing, savings charts and progress rewards.</p><p>{paywallFeature}</p>{(['monthly','yearly','lifetime'] as const).filter(plan => !hiddenPlanSet.has(plan)).map(plan => <button key={plan} className="block w-full border rounded-xl p-4 my-3" onClick={() => handleCheckout(plan)}>{plan === 'monthly' ? 'Monthly · AUD $9.99/month' : plan === 'yearly' ? 'Yearly · AUD $29.95/year' : 'Lifetime · AUD $49.95 once'}</button>)}{hiddenPlanSet.size > 0 && <p>Temporarily unavailable: {[...hiddenPlanSet].map(l => l === 'lifetime' ? 'Lifetime' : l === 'yearly' ? 'Yearly' : 'Monthly').join(' and ')}. Everything else works as normal.</p>}<p>Monthly and yearly plans renew automatically until cancelled. Review the final price and terms in Stripe before paying.</p><p className="mt-3">{user ? 'Progress and verified premium access sync to your signed-in account.' : 'Progress is stored in this browser until you sign in from Settings.'}</p></section></div>}

      {/* Share Modal */}
      {showShare && (
        <div className="fixed inset-0 z-[95] flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="absolute inset-0 bg-black/80 backdrop-blur-xl" onClick={() => setShowShare(false)} />
          <div className="relative w-full sm:max-w-[520px] rounded-t-[28px] sm:rounded-[28px] bg-[#121214] border border-white/[0.12] shadow-[0_30px_100px_rgba(0,0,0,0.9)] overflow-hidden flex flex-col max-h-[94vh]">
            <div className="p-6 overflow-auto">
              <div className="flex items-center justify-between mb-5">
                <div className="flex items-center gap-3"><div className="w-9 h-9 rounded-[12px] bg-white app-readable-text flex items-center justify-center"><Share2 className="w-5 h-5" /></div><div><div className="text-[16px] font-bold">Share Your Win</div><div className="text-[11px] text-white/40">Preview your progress image before sharing</div></div></div>
                <button onClick={() => setShowShare(false)} className="w-9 h-9 rounded-full bg-white/[0.06] border border-white/[0.08] flex items-center justify-center"><X className="w-4 h-4" /></button>
              </div>

              <div className="flex gap-2 mb-4">
                <button onClick={() => setShareType('money')} className={`flex-1 h-10 rounded-full text-[12px] font-bold border transition ${shareType === 'money' ? 'bg-white app-readable-text border-white' : 'bg-white/[0.06] border-white/[0.08] text-white/50'}`}>💰 {money(moneySaved)} Saved</button>
                <button onClick={() => setShareType('days')} className={`flex-1 h-10 rounded-full text-[12px] font-bold border transition ${shareType === 'days' ? 'bg-white app-readable-text border-white' : 'bg-white/[0.06] border-white/[0.08] text-white/50'}`}>📅 {days} Days Free</button>
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
                }} className="h-12 rounded-[12px] bg-white app-readable-text font-bold text-[13px] flex items-center justify-center gap-2"><Download className="w-4 h-4" /> Download PNG</button>
                <button onClick={async () => {
                  const c = canvasRef.current; if (!c) return;
                  try {
                    const blob = await new Promise<Blob | null>(res => c.toBlob(res, 'image/png'));
                    if (!blob) return;
                    const file = new File([blob], 'clear-win.png', { type: 'image/png' });
                    // @ts-ignore
                    if (navigator.canShare && navigator.canShare({ files: [file] })) {
                      // @ts-ignore
                      await navigator.share({ files: [file], title: 'I quit with Clear+', text: `My estimated spending avoided is ${money(moneySaved)} and quit for ${days} days with Clear+!` });
                    } else if (navigator.share) {
                      // @ts-ignore
                      await navigator.share({ title: 'I quit with Clear+', text: `My estimated spending avoided is ${money(moneySaved)} and quit for ${days} days with Clear+! www.clear-plus.app` });
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
                  const text = `My estimated spending avoided is ${money(moneySaved)} and quit for ${days} days with Clear+! www.clear-plus.app`;
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
          <div className="sos-accent-wash absolute inset-0" />
          <div className="relative z-10 flex items-center justify-between p-6"><div className="flex items-center gap-3"><div className="breathing-icon-tile app-accent-fill w-9 h-9 flex items-center justify-center"><Wind className="w-5 h-5" /></div><div><div className="text-[13px] font-bold">Breathing exercise</div><div className="text-[11px] text-white/40">4-7-8 • Craving will pass</div></div></div><button onClick={() => { setShowSOSFull(false); setBreathRunning(false); }} className="w-10 h-10 rounded-full bg-white/[0.08] border border-white/[0.10] flex items-center justify-center"><X className="w-5 h-5" /></button></div>
          <div className="relative z-10 flex-1 flex flex-col items-center justify-center p-8 text-center">
            <div className="mb-8"><div className="text-[11px] tracking-[0.2em] uppercase font-bold text-white/30">Round {breathCount + 1} • {breathPhase}</div><div className="mt-2 text-[28px] font-[800] capitalize">{breathPhase === 'inhale' ? 'Breathe in slowly' : breathPhase === 'hold' ? 'Hold' : breathPhase === 'exhale' ? 'Breathe out fully' : 'Rest'}</div></div>
            <div className="relative w-[260px] h-[260px] flex items-center justify-center"><div className={`absolute rounded-full border border-white/10 transition-all duration-[1000ms] ${breathPhase === 'inhale' ? 'w-[240px] h-[240px] bg-white/[0.06]' : breathPhase === 'hold' ? 'w-[240px] h-[240px] bg-white/[0.08]' : breathPhase === 'exhale' ? 'w-[120px] h-[120px] bg-white/[0.03]' : 'w-[160px] h-[160px] bg-white/[0.04]'}`} /><div className={`breath-orb absolute rounded-full transition-all ease-in-out ${breathPhase === 'inhale' ? 'w-[200px] h-[200px] duration-[4000ms]' : breathPhase === 'hold' ? 'w-[200px] h-[200px] duration-[7000ms]' : breathPhase === 'exhale' ? 'w-[90px] h-[90px] duration-[8000ms]' : 'w-[130px] h-[130px] duration-[1000ms]'}`} /><div className="breath-orb-copy relative z-10 text-center"><div className="text-[42px] font-[900] tabular-nums">{breathPhase === 'inhale' ? '4s' : breathPhase === 'hold' ? '7s' : breathPhase === 'exhale' ? '8s' : '•'}</div><div className="text-[11px] tracking-widest uppercase text-white/50 font-bold mt-1">{breathPhase}</div></div></div>
            <div className="mt-10 flex items-center gap-3"><button onClick={toggleBreathing} className="app-accent-fill h-12 px-6 rounded-full font-bold text-[13px] flex items-center gap-2"><Play className="w-4 h-4" />{breathRunning ? 'Pause' : 'Start'}</button><button onClick={() => { setBreathCount(0); setBreathPhase('inhale'); }} type="button" className="breathing-reset app-accent-fill h-12 flex items-center justify-center gap-2"><RotateCcw className="w-4 h-4" /> Reset</button></div>
          </div>
          <div className="relative z-10 p-6 flex gap-3"><button onClick={beatCurrentCraving} className="app-accent-fill flex-1 h-12 rounded-full font-bold text-[13px] flex items-center justify-center gap-2"><Sparkles className="w-4 h-4" /> I beat the craving</button><button onClick={() => { setShowSOSFull(false); resetBreathing(); }} className="h-12 px-6 rounded-full bg-white/[0.08] border border-white/[0.10] text-[13px]">Close</button></div>
        </div>
      )}

      {/* Craving form */}
      {showCravingForm && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="absolute inset-0 bg-black/70 backdrop-blur-xl" onClick={() => { setShowCravingForm(false); setCravingLogOutcome('logged'); }} />
          <div className="relative w-full sm:max-w-[400px] rounded-t-[24px] sm:rounded-[24px] bg-[#161618] border border-white/[0.10] p-6">
            <div className="flex items-center justify-between mb-5"><h3 className="font-bold">{cravingLogOutcome === 'beaten' ? 'Log the craving you beat' : 'Log craving'}</h3><button onClick={() => { setShowCravingForm(false); setCravingLogOutcome('logged'); }} className="w-8 h-8 rounded-full bg-white/[0.06] flex items-center justify-center"><X className="w-4 h-4" /></button></div>
            <div className="space-y-4">
              <div><label className="text-[11px] uppercase tracking-widest font-bold text-white/30 mb-2 block">Trigger</label><div className="grid grid-cols-3 gap-2">{['Stress', 'Coffee', 'After meal', 'Boredom', 'Social', 'Driving'].map(t => (<button key={t} onClick={() => setCravingTrigger(t)} className={`h-9 rounded-full text-[11px] font-medium border transition ${cravingTrigger === t ? 'bg-white app-readable-text border-white' : 'bg-white/[0.05] border-white/[0.08] text-white/60'}`}>{t}</button>))}</div></div>
              <div className="rounded-[16px] bg-white/[0.04] border border-white/[0.08] p-4">
                <div className="flex items-center justify-between mb-4"><label htmlFor="craving-intensity" className="text-[11px] uppercase tracking-widest font-bold text-white/40">Intensity</label><strong className="app-accent-soft min-w-14 h-8 px-2 rounded-full flex items-center justify-center text-[13px]">{cravingIntensity}/10</strong></div>
                <input id="craving-intensity" aria-label="Craving intensity" type="range" min={1} max={10} value={cravingIntensity} onChange={e => setCravingIntensity(parseInt(e.target.value))} className="craving-intensity w-full" style={{ background: `linear-gradient(to right, var(--theme-accent) 0%, var(--theme-accent) ${((cravingIntensity - 1) / 9) * 100}%, var(--theme-soft) ${((cravingIntensity - 1) / 9) * 100}%, var(--theme-soft) 100%)` }} />
                <div className="mt-3 flex justify-between text-[10px] text-white/35"><span>1 • Mild</span><span>10 • Intense</span></div>
              </div>
              <div><label className="text-[11px] uppercase tracking-widest font-bold text-white/30 mb-2 block">Note (optional)</label><input value={cravingNote} onChange={e => setCravingNote(e.target.value)} placeholder="What helped?" className="w-full h-11 px-4 rounded-[12px] bg-white/[0.06] border border-white/[0.10] text-[13px] placeholder:text-white/30 focus:outline-none" /></div>
              <button onClick={addCraving} className="w-full h-12 rounded-[14px] bg-white app-readable-text font-bold text-[13px] flex items-center justify-center gap-2"><Wind className="w-4 h-4" /> {cravingLogOutcome === 'beaten' ? 'Save as beaten' : 'Save craving'}</button>
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
              <p className="text-[12px]">If an existing shortcut still shows the old C or green icon, first confirm your progress is synced, then remove that shortcut and install Clear+ again from www.clear-plus.app. Do not clear your browser data.</p>
              <button onClick={() => setShowInstallHelp(false)} className="w-full h-11 rounded-[12px] bg-white app-readable-text font-bold">Got it</button>
            </div>
          </div>
        </div>
      )}

       <Analytics />
       <style>{`@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap'); .clear-shell, .clear-shell *{font-family:var(--app-font, Inter, ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial)}`}</style>
    </div>
  );
}
