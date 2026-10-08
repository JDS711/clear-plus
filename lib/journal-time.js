// Display local weekday + day/month + time, without a year. Keep the stored ISO instant unchanged.
export function journalDateTime(value) {
  const date = new Date(value);
  return Number.isFinite(date.getTime()) ? date.toISOString() : undefined;
}
export function formatJournalTimestamp(value, locale = 'en-AU', timeZone) {
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return 'Time unavailable';
  const zone = timeZone ? { timeZone } : {};
  const day = new Intl.DateTimeFormat(locale, { weekday: 'long', day: 'numeric', month: 'long', ...zone }).format(date);
  const time = new Intl.DateTimeFormat(locale, { hour: 'numeric', minute: '2-digit', hour12: true, ...zone }).format(date);
  return `${day} · ${time}`;
}
