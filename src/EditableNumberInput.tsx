import React, { useEffect, useRef, useState } from 'react';

type Props = Omit<React.InputHTMLAttributes<HTMLInputElement>, 'value' | 'onChange'> & {
  value: number;
  onValueChange: (value: number) => void;
  min: number;
  max: number;
};

export default function EditableNumberInput({
  value,
  onValueChange,
  min,
  max,
  step,
  onBlur,
  onFocus,
  onKeyDown,
  ...props
}: Props) {
  const [draft, setDraft] = useState(String(value));
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (document.activeElement !== inputRef.current) setDraft(String(value));
  }, [value]);

  const commit = () => {
    const parsed = Number(draft);
    if (!draft.trim() || !Number.isFinite(parsed)) {
      setDraft(String(value));
      return;
    }
    const next = Math.min(max, Math.max(min, parsed));
    onValueChange(next);
    setDraft(String(next));
  };

  return (
    <input
      {...props}
      ref={inputRef}
      type="number"
      inputMode={step && Number(step) < 1 ? 'decimal' : 'numeric'}
      min={min}
      max={max}
      step={step}
      value={draft}
      onChange={event => setDraft(event.target.value)}
      onFocus={event => {
        event.currentTarget.select();
        onFocus?.(event);
      }}
      onBlur={event => {
        commit();
        onBlur?.(event);
      }}
      onKeyDown={event => {
        if (event.key === 'Enter') event.currentTarget.blur();
        onKeyDown?.(event);
      }}
    />
  );
}