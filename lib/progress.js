export const FIVE_MINUTE_PAUSE_SECONDS = 300;

export function fiveMinutePauseRemaining(endMs, nowMs) {
  if (!Number.isFinite(endMs) || !Number.isFinite(nowMs)) return FIVE_MINUTE_PAUSE_SECONDS;
  return Math.min(
    FIVE_MINUTE_PAUSE_SECONDS,
    Math.max(0, Math.floor((endMs - nowMs) / 1000)),
  );
}

export function buildSavingsProjection(days, hours, dailyCost, pastDays = 14, futureDays = 15) {
  const safeDays = Math.max(0, Number(days) || 0);
  const safeHours = Math.max(0, Math.min(23, Number(hours) || 0));
  const safeDailyCost = Math.max(0, Number(dailyCost) || 0);
  const currentDay = safeDays + safeHours / 24;
  const startDay = Math.max(0, safeDays - pastDays);
  const endDay = safeDays + futureDays;
  const points = [];

  for (let day = startDay; day <= endDay; day += 1) {
    const isToday = day === safeDays;
    const representedDay = isToday ? currentDay : day;
    points.push({
      day,
      saved: representedDay * safeDailyCost,
      kind: isToday ? 'today' : day < safeDays ? 'history' : 'projection',
    });
  }
  return points;
}