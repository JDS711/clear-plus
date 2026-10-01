export const FREE_GUIDED_SESSIONS = 3;

export function canStartGuidedBreathing(isPremium, uses) {
  return Boolean(isPremium) || uses < FREE_GUIDED_SESSIONS;
}

export function nextGuidedUseCount(isPremium, uses) {
  return isPremium ? uses : Math.min(FREE_GUIDED_SESSIONS, uses + 1);
}
