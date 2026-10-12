import { useTranslation } from "react-i18next";
import type {
  TranscodeEstimate,
  TranscodeJobSettings,
} from "@rawkoon/shared/types";
import { formatBytes, formatDuration } from "@/features/transcode/format";

export function EstimatePanel({
  est,
  s,
  saved,
  nowPct,
  laterPct,
  seeding,
  outdated,
  sourceLine,
  refining,
  refined,
  count,
  onRefine,
}: {
  est: TranscodeEstimate | undefined;
  s: TranscodeJobSettings;
  saved: number;
  nowPct: number;
  laterPct: number;
  seeding: number;
  outdated: boolean;
  sourceLine: string;
  refining: boolean;
  refined: boolean;
  count: number;
  onRefine: () => void;
}) {
  const { t } = useTranslation("common");
  return (
    <div
      className="mx-5 mt-1 rounded-xl border border-neutral-800 bg-neutral-950 px-4 py-3.5"
      aria-live="polite"
    >
      {est ? (
        <>
          <div className="flex flex-wrap items-baseline gap-2.5">
            <span className="font-display text-2xl font-semibold text-neutral-50">
              {est.source === "target" ? "" : "≈ "}
              {formatBytes(est.total_estimated_bytes)}
            </span>
            <span className="text-sm text-neutral-500 line-through">
              {formatBytes(est.total_source_bytes)}
            </span>
            <span className="text-xs text-neutral-400">±{est.range_pct}%</span>
            {saved > 0 && (
              <span className="ml-auto rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-xs font-semibold text-emerald-300">
                {t("transcode.estimate.saved", {
                  size: formatBytes(saved),
                })}
              </span>
            )}
          </div>
          <div className="my-3 flex h-1.5 overflow-hidden rounded-full bg-neutral-800">
            <i
              className="block h-full bg-emerald-400"
              style={{ width: `${nowPct}%` }}
            />
            <i
              className="block h-full bg-emerald-400/35"
              style={{ width: `${laterPct}%` }}
            />
          </div>
          <div className="grid grid-cols-3 gap-2.5">
            <div>
              <div className="font-mono text-[11px] uppercase text-neutral-500">
                {t("transcode.estimate.freesNow")}
              </div>
              <div className="font-medium text-neutral-50">
                {formatBytes(est.frees_now_bytes)}
              </div>
            </div>
            <div>
              <div className="font-mono text-[11px] uppercase text-neutral-500">
                {t("transcode.estimate.afterSeeding")}
              </div>
              <div className="text-neutral-400">
                +{formatBytes(est.frees_after_seeding_bytes)}
              </div>
            </div>
            <div>
              <div className="font-mono text-[11px] uppercase text-neutral-500">
                {t("transcode.estimate.time")}
              </div>
              <div className="font-medium text-neutral-50">
                ~{formatDuration(est.eta_secs)}
              </div>
            </div>
          </div>
          {seeding > 0 && (
            <p className="mt-2.5 rounded-lg border border-amber-400/25 bg-amber-400/10 px-2.5 py-2 text-xs text-amber-300">
              {t("transcode.estimate.seedingWarning", {
                count: seeding,
                size: formatBytes(est.temporary_growth_bytes),
              })}
            </p>
          )}
          <div className="mt-3 flex items-center justify-between border-t border-dashed border-neutral-800 pt-2.5 text-xs text-neutral-400">
            <span className={outdated ? "text-amber-300" : undefined}>
              {refining ? t("transcode.estimate.refining") : sourceLine}
            </span>
            {s.mode === "quality" && (
              <button
                type="button"
                onClick={onRefine}
                disabled={refining || count === 0}
                className="font-medium text-primary-400 disabled:opacity-40"
              >
                {refined
                  ? t("transcode.estimate.refineAgain")
                  : t("transcode.estimate.refine")}
              </button>
            )}
          </div>
        </>
      ) : (
        <span className="text-sm text-neutral-400">
          {t("transcode.estimate.loading")}
        </span>
      )}
    </div>
  );
}
