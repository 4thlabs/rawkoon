import { formatBytes as formatSize } from "@/lib/utils/format";
export const formatBytes = (raw: string | null): string => {
  if (!raw) return "—";
  const n = Number(raw);
  return Number.isFinite(n) && n > 0 ? formatSize(n) : "—";
};

/** Radix Select has no empty value, so "no profile" needs a sentinel. */
export const NO_PROFILE = "none";
