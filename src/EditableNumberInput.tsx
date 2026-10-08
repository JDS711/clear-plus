import React, { useEffect, useRef, useState } from 'react';
import { ChevronUp, ChevronDown } from 'lucide-react';

type Props = Omit<React.InputHTMLAttributes<HTMLInputElement>, 'value' | 'onChange'> & {
  value: number;
  onValueChange: (value: number) => void;
  min: number;
  max: number;
};

export default function EditableNumberInput({
  value, onValueChange, min, max, step, onBlur, onFocus, onKeyDown, ...props
}: Props) {
  const [draft, setDraft] = useState(String(value));
  const inputRef = useRef<HTMLInputElement>(null);
  const amount = Number(step) > 0 ? Number(step) : 1;
  const label = props['aria-label'] || 'value';
  const parsedDraft = draft.trim() ? Number(draft) : value;
  const current = Number.isFinite(parsedDraft) ? parsedDraft : value;
  const unavailable = props.disabled || props.readOnly;

  useEffect(() => {
    if (document.activeElement !== inputRef.current) setDraft(String(value));
  }, [value]);

  const commit = () => {
    const parsed = Number(draft);
    if (!draft.trim() || !Number.isFinite(parsed)) { setDraft(String(value)); return; }
    const next = Math.min(max, Math.max(min, parsed));
    onValueChange(next); setDraft(String(next));
  };
  const stepBy = (direction: number) => {
    if (unavailable) return;
    const next = Math.min(max, Math.max(min, Number((current + direction * amount).toFixed(10))));
    onValueChange(next); setDraft(String(next));
  };

  return (
    <div className="number-input-control">
      <input {...props} ref={inputRef} type="number" className={`${props.className || ''} number-input-native`}
        inputMode={amount < 1 ? 'decimal' : 'numeric'} min={min} max={max} step={step} value={draft}
        onChange={event => setDraft(event.target.value)}
        onFocus={event => { event.currentTarget.select(); onFocus?.(event); }}
        onBlur={event => { commit(); onBlur?.(event); }}
        onKeyDown={event => {
          if (event.key === 'Enter') event.currentTarget.blur();
          if (event.key === 'ArrowUp' || event.key === 'ArrowDown') { event.preventDefault(); stepBy(event.key === 'ArrowUp' ? 1 : -1); }
          onKeyDown?.(event);
        }}
      />
      <button type="button" className="number-step" aria-label={`Increase ${label}`} disabled={unavailable || current >= max} onClick={() => stepBy(1)}><ChevronUp aria-hidden="true" size={20} /></button>
      <button type="button" className="number-step" aria-label={`Decrease ${label}`} disabled={unavailable || current <= min} onClick={() => stepBy(-1)}><ChevronDown aria-hidden="true" size={20} /></button>
    </div>
  );
}
