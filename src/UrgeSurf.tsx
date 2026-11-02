import React, { useEffect, useState } from 'react';

type Props = {
  onDone: () => void;
};

export default function UrgeSurf({ onDone }: Props) {
  const [seconds, setSeconds] = useState(180);
  const [running, setRunning] = useState(true);

  useEffect(() => {
    if (!running || seconds <= 0) return;
    const t = setTimeout(() => setSeconds(s => s - 1), 1000);
    return () => clearTimeout(t);
  }, [running, seconds]);

  const mm = Math.floor(seconds / 60);
  const ss = String(seconds % 60).padStart(2, '0');

  return (
    <div className="mt-6 text-center">
      <div className="text-xs uppercase tracking-widest text-white/40 mb-1">Urge surfing</div>
      <div className="text-5xl font-black tabular-nums">{mm}:{ss}</div>
      <p className="text-sm text-white/60 mt-2 mb-4">Notice the craving. It rises, peaks, and passes. You don’t have to act on it.</p>
      <div className="flex gap-2 justify-center">
        <button onClick={() => setRunning(r => !r)} className="px-4 py-2 rounded-lg bg-white/10 text-sm">
          {running ? 'Pause' : 'Resume'}
        </button>
        <button onClick={() => { setSeconds(180); setRunning(true); }} className="px-4 py-2 rounded-lg bg-white/10 text-sm">
          Restart
        </button>
        <button onClick={onDone} className="px-4 py-2 rounded-lg bg-white text-black text-sm font-bold">
          Wave passed
        </button>
      </div>
    </div>
  );
}
