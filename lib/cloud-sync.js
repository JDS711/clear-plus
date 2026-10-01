const validDateMs = (value) => {
  const ms = value ? new Date(value).getTime() : NaN;
  return Number.isFinite(ms) ? ms : null;
};

const records = (value) => Array.isArray(value) ? value.filter(item => item && typeof item.id === 'string') : [];

const mergeRecords = (local, remote, dateKey) => {
  const byId = new Map();
  for (const item of [...records(remote), ...records(local)]) {
    const previous = byId.get(item.id);
    if (!previous) {
      byId.set(item.id, item);
      continue;
    }
    const previousMs = validDateMs(previous[dateKey]) ?? 0;
    const itemMs = validDateMs(item[dateKey]) ?? 0;
    const newer = itemMs >= previousMs ? item : previous;
    byId.set(item.id, {
      ...previous,
      ...newer,
      ...(Object.hasOwn(previous, 'passed') || Object.hasOwn(item, 'passed')
        ? { passed: Boolean(previous.passed || item.passed) }
        : {}),
    });
  }
  return [...byId.values()].sort((a, b) => (validDateMs(b[dateKey]) ?? 0) - (validDateMs(a[dateKey]) ?? 0));
};

export const progressScore = (state = {}) =>
  (validDateMs(state.quitDate) ? 1000 : 0) +
  (state.premiumSession ? 500 : 0) +
  records(state.cravings).length * 10 +
  records(state.journals).length * 10;

export const reconcileCloudStates = (local = {}, remote = {}, options = {}) => {
  const localScore = progressScore(local);
  const remoteScore = progressScore(remote);
  const primary = localScore > remoteScore || (options.preferLocalOnTie && localScore === remoteScore)
    ? local
    : remote;
  const localQuit = validDateMs(local.quitDate);
  const remoteQuit = validDateMs(remote.quitDate);
  const earliestQuit = localQuit && remoteQuit
    ? new Date(Math.min(localQuit, remoteQuit)).toISOString()
    : localQuit
      ? new Date(localQuit).toISOString()
      : remoteQuit
        ? new Date(remoteQuit).toISOString()
        : null;

  return {
    version: 2,
    quitDate: earliestQuit,
    cigsPerDay: Number.isFinite(primary.cigsPerDay) ? primary.cigsPerDay : 20,
    costPerPack: Number.isFinite(primary.costPerPack) ? primary.costPerPack : 50,
    packSize: Number.isFinite(primary.packSize) ? primary.packSize : 25,
    sosUses: Math.max(Number(local.sosUses) || 0, Number(remote.sosUses) || 0),
    cravings: mergeRecords(local.cravings, remote.cravings, 'time'),
    journals: mergeRecords(local.journals, remote.journals, 'date'),
    referral: typeof primary.referral === 'string' ? primary.referral : '',
    appTheme: primary.appTheme || 'green',
    appFont: primary.appFont || 'segoe',
    displayMode: primary.displayMode || 'light',
    textSize: primary.textSize || 'standard',
    premiumSession: remote.premiumSession || local.premiumSession || null,
  };
};
