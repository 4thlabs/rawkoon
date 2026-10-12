import type { DownloadClientHookStatus } from "@rawkoon/shared/types";

export function statusClass(status: DownloadClientHookStatus): string {
  switch (status) {
    case "active":
      return "bg-green-900/20 border-green-800 text-green-200";
    case "foreign-program":
      return "bg-amber-900/20 border-amber-700 text-amber-200";
    case "stale":
    case "awaiting-first":
      return "bg-amber-900/20 border-amber-800 text-amber-200";
    default:
      return "bg-neutral-900/60 border-neutral-700 text-neutral-300";
  }
}
