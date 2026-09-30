export const FREE_DAILY_LOGS = 3;

export function countDailyLogs(cravings, now = new Date()) {
  return cravings.filter(craving => new Date(craving.time).toDateString() === now.toDateString()).length;
}

export function canSaveCraving(cravings, premium, now = new Date()) {
  return premium || countDailyLogs(cravings, now) < FREE_DAILY_LOGS;
}
