export const formatBytes = (raw: string | null): string => {
  if (!raw) return "—";
  const n = Number(raw);
  if (!Number.isFinite(n) || n === 0) return "—";
  const mb = n / 1_048_576;
  if (mb >= 1024) return `${(mb / 1024).toFixed(1)} GB`;
  // Same rule as the list, so one book does not report two different sizes.
  return mb >= 10 ? `${Math.round(mb)} MB` : `${mb.toFixed(1)} MB`;
};

/** Radix Select has no empty value, so "no profile" needs a sentinel. */
export const NO_PROFILE = "none";
