import React, { useState } from 'react';

type Props = {
  open: boolean;
  onClose: () => void;
  onComplete: (reasons: string[], triggers: string[]) => void;
  initialReasons?: string[];
  initialTriggers?: string[];
};

const REASON_SUGGESTIONS = [
  'Health',
  'Money',
  'Family',
  'Fitness',
  'Smell / taste',
  'Freedom',
  'Set an example',
];

const TRIGGER_SUGGESTIONS = [
  'Stress',
  'Coffee',
  'After meals',
  'Social',
  'Boredom',
  'Driving',
  'Alcohol',
];

export default function Onboarding({ open, onClose, onComplete, initialReasons = [], initialTriggers = [] }: Props) {
  const [reasons, setReasons] = useState<string[]>(initialReasons);
  const [triggers, setTriggers] = useState<string[]>(initialTriggers);
  const [customReason, setCustomReason] = useState('');
  const [customTrigger, setCustomTrigger] = useState('');

  if (!open) return null;

  const toggle = (list: string[], setList: (v: string[]) => void, item: string) => {
    setList(list.includes(item) ? list.filter(x => x !== item) : [...list, item]);
  };

  const addCustom = (value: string, list: string[], setList: (v: string[]) => void, clear: () => void) => {
    const trimmed = value.trim();
    if (trimmed && !list.includes(trimmed)) {
      setList([...list, trimmed]);
      clear();
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/70">
      <div className="bg-[#121214] border border-white/10 rounded-3xl p-6 max-w-lg w-full max-h-[90vh] overflow-auto">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold">Your reasons & triggers</h2>
          <button onClick={onClose} className="text-white/60">✕</button>
        </div>
        <p className="text-sm text-white/60 mb-4">These help personalise your SOS screen. You can change them anytime in Settings.</p>

        <div className="mb-5">
          <div className="text-xs font-bold uppercase tracking-wider text-white/40 mb-2">Reasons to quit</div>
          <div className="flex flex-wrap gap-2 mb-2">
            {REASON_SUGGESTIONS.map(r => (
              <button
                key={r}
                type="button"
                onClick={() => toggle(reasons, setReasons, r)}
                className={`px-3 py-1.5 rounded-full text-sm border ${reasons.includes(r) ? 'bg-white text-black border-white' : 'border-white/20'}`}
              >
                {r}
              </button>
            ))}
          </div>
          <div className="flex gap-2">
            <input
              value={customReason}
              onChange={e => setCustomReason(e.target.value)}
              placeholder="Add your own"
              className="flex-1 bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm"
              onKeyDown={e => e.key === 'Enter' && addCustom(customReason, reasons, setReasons, () => setCustomReason(''))}
            />
            <button type="button" onClick={() => addCustom(customReason, reasons, setReasons, () => setCustomReason(''))} className="px-3 py-2 bg-white/10 rounded-lg text-sm">Add</button>
          </div>
        </div>

        <div className="mb-6">
          <div className="text-xs font-bold uppercase tracking-wider text-white/40 mb-2">Common triggers</div>
          <div className="flex flex-wrap gap-2 mb-2">
            {TRIGGER_SUGGESTIONS.map(t => (
              <button
                key={t}
                type="button"
                onClick={() => toggle(triggers, setTriggers, t)}
                className={`px-3 py-1.5 rounded-full text-sm border ${triggers.includes(t) ? 'bg-white text-black border-white' : 'border-white/20'}`}
              >
                {t}
              </button>
            ))}
          </div>
          <div className="flex gap-2">
            <input
              value={customTrigger}
              onChange={e => setCustomTrigger(e.target.value)}
              placeholder="Add your own"
              className="flex-1 bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm"
              onKeyDown={e => e.key === 'Enter' && addCustom(customTrigger, triggers, setTriggers, () => setCustomTrigger(''))}
            />
            <button type="button" onClick={() => addCustom(customTrigger, triggers, setTriggers, () => setCustomTrigger(''))} className="px-3 py-2 bg-white/10 rounded-lg text-sm">Add</button>
          </div>
        </div>

        <button
          onClick={() => onComplete(reasons, triggers)}
          className="w-full h-12 rounded-xl bg-white text-black font-bold"
        >
          Save & continue
        </button>
      </div>
    </div>
  );
}
