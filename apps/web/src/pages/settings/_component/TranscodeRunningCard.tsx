import { useTranslation } from "react-i18next";
import type { TranscodeJob } from "@rawkoon/shared/types";
import { formatBytes, formatDuration } from "@/features/transcode/format";
import { cn } from "@/lib/utils";
import { settingsLabel, STEPS } from "./transcodeTabHelpers";

export function TranscodeRunningCard({
  running,
  onCancel,
}: {
  running: TranscodeJob;
  onCancel: () => void;
}) {
  const { t } = useTranslation("common");
  const stepIndex = running.step ? STEPS.indexOf(running.step) : -1;
  const progress = running.live?.progress ?? running.progress ?? 0;
  const elapsed = running.started_at
    ? Math.round((Date.now() - Date.parse(running.started_at)) / 1000)
    : 0;

  return (
    <section className="rounded-xl border border-neutral-800 bg-neutral-900 p-4">
      <div className="flex items-start gap-3.5">
        <div className="min-w-0 flex-1">
          <div className="text-[10px] font-bold uppercase tracking-[0.15em] text-neutral-400">
            {t("transcode.admin.now")}
          </div>
          <div className="font-display text-[17px] font-semibold text-neutral-50">
            {running.title}
          </div>
          <div className="mt-1.5 flex flex-wrap gap-1.5">
            <span className="rounded-full border border-neutral-800 bg-neutral-950 px-2 text-[11px] text-neutral-400">
              {settingsLabel(running)}
            </span>
          </div>
        </div>
        <button
          type="button"
          onClick={() => onCancel()}
          className="rounded-lg border border-neutral-700 px-3 py-1.5 text-[13px] font-semibold text-neutral-200"
        >
          {t("transcode.admin.cancelJob")}
        </button>
      </div>
      <div className="my-4 flex">
        <div className="relative flex-1 pt-3 text-[11px] text-neutral-400 before:absolute before:left-0 before:right-1 before:top-0 before:h-[3px] before:rounded before:bg-emerald-400">
          {t("transcode.admin.steps.queued")}
        </div>
        {STEPS.map((s, i) => (
          <div
            key={s}
            className={cn(
              "relative flex-1 pt-3 text-[11px] before:absolute before:left-0 before:right-1 before:top-0 before:h-[3px] before:rounded",
              i < stepIndex
                ? "text-neutral-400 before:bg-emerald-400"
                : i === stepIndex
                  ? "font-semibold text-neutral-50 before:bg-primary-400"
                  : "text-neutral-500 before:bg-neutral-800",
            )}
          >
            {t(`transcode.admin.steps.${s}`)}
            {s === "encode" && i === stepIndex
              ? ` ${Math.round(progress * 100)}%`
              : ""}
          </div>
        ))}
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-neutral-950">
        <i
          className="block h-full rounded-full bg-gradient-to-r from-primary-600 to-primary-400"
          style={{ width: `${Math.round(progress * 100)}%` }}
        />
      </div>
      <div className="mt-3 grid grid-cols-2 gap-2.5 text-sm md:grid-cols-5">
        <div>
          <div className="font-mono text-[11px] text-neutral-500">
            {t("transcode.admin.speed")}
          </div>
          <div className="text-neutral-50">
            {running.live?.fps
              ? `${Math.round(running.live.fps)} fps · ${running.live.speed ?? "–"}×`
              : "–"}
          </div>
        </div>
        <div>
          <div className="font-mono text-[11px] text-neutral-500">
            {t("transcode.admin.elapsed")}
          </div>
          <div className="text-neutral-50">{formatDuration(elapsed)}</div>
        </div>
        <div>
          <div className="font-mono text-[11px] text-neutral-500">
            {t("transcode.admin.eta")}
          </div>
          <div className="text-neutral-50">
            {running.live?.eta_secs != null
              ? `~${formatDuration(running.live.eta_secs)}`
              : "–"}
          </div>
        </div>
        <div>
          <div className="font-mono text-[11px] text-neutral-500">
            {t("transcode.admin.size")}
          </div>
          <div className="text-neutral-50">
            {formatBytes(running.source_bytes)} →{" "}
            {running.live?.current_bytes
              ? formatBytes(running.live.current_bytes)
              : "–"}
          </div>
        </div>
        <div>
          <div className="font-mono text-[11px] text-neutral-500">
            {t("transcode.admin.estWas")}
          </div>
          <div className="text-neutral-400">
            {running.estimated_bytes
              ? formatBytes(running.estimated_bytes)
              : "–"}
          </div>
        </div>
      </div>
    </section>
  );
}
