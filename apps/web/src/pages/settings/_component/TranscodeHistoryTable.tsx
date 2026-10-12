import { Fragment } from "react";
import { useTranslation } from "react-i18next";
import type { TranscodeJob } from "@rawkoon/shared/types";
import { formatBytes, formatDuration } from "@/features/transcode/format";
import type { useTranscodeJobAction } from "@/features/transcode/hooks";
import { cn } from "@/lib/utils";

export function TranscodeHistoryTable({
  history,
  act,
  safe,
  freeSource,
  discard,
}: {
  history: TranscodeJob[];
  act: ReturnType<typeof useTranscodeJobAction>;
  safe: (p: Promise<unknown>) => Promise<unknown>;
  freeSource: (id: number, title: string) => Promise<void>;
  discard: (id: number, title: string) => void;
}) {
  const { t } = useTranslation("common");

  return (
    <>
      <div className="flex items-center justify-between">
        <h2 className="font-display text-[17px] font-semibold text-neutral-50">
          {t("transcode.admin.history")}
        </h2>
        <span className="text-xs text-neutral-500">
          {t("transcode.admin.historyHint")} ·{" "}
          <button
            type="button"
            onClick={() => safe(act.clearHistory())}
            className="text-primary-400"
          >
            {t("transcode.admin.clearFinished")}
          </button>
        </span>
      </div>
      <section className="overflow-hidden rounded-xl border border-neutral-800 bg-neutral-900">
        <table className="w-full text-[13px]">
          <thead>
            <tr className="border-b border-neutral-800 text-left font-mono text-[11px] uppercase text-neutral-500">
              <th className="px-3 py-2">{t("transcode.admin.cols.item")}</th>
              <th className="px-3 py-2">{t("transcode.admin.cols.result")}</th>
              <th className="px-3 py-2">
                {t("transcode.admin.cols.beforeAfter")}
              </th>
              <th className="px-3 py-2">{t("transcode.admin.cols.saved")}</th>
              <th className="px-3 py-2 mobile-max:hidden">
                {t("transcode.admin.cols.ssim")}
              </th>
              <th className="px-3 py-2 mobile-max:hidden">
                {t("transcode.admin.cols.took")}
              </th>
              <th />
            </tr>
          </thead>
          <tbody>
            {history.map((j) => {
              const diff = j.output_bytes
                ? Number(j.source_bytes) - Number(j.output_bytes)
                : 0;
              const seeding = (j.source_nlink ?? 1) > 1;
              const took =
                j.started_at && j.finished_at
                  ? Math.round(
                      (Date.parse(j.finished_at) - Date.parse(j.started_at)) /
                        1000,
                    )
                  : null;
              return (
                <Fragment key={j.id}>
                  <tr className="border-b border-neutral-800">
                    <td className="px-3 py-2">{j.title}</td>
                    <td
                      className={cn(
                        "px-3 py-2",
                        j.status === "done"
                          ? "text-emerald-300"
                          : j.status === "failed"
                            ? "text-red-400"
                            : "text-neutral-400",
                      )}
                    >
                      {t(
                        `transcode.admin.result.${j.status === "done" ? "done" : j.status}`,
                      )}
                      {j.status === "done" && seeding && (
                        <span className="text-neutral-500">
                          {" "}
                          {t("transcode.admin.result.seeding")}
                        </span>
                      )}
                    </td>
                    <td className="px-3 py-2 tabular-nums">
                      {j.status === "done" && j.output_bytes
                        ? `${formatBytes(j.source_bytes)} → ${formatBytes(j.output_bytes)}`
                        : t("transcode.admin.kept", {
                            size: formatBytes(j.source_bytes),
                          })}
                    </td>
                    <td className="px-3 py-2 tabular-nums">
                      {j.status !== "done" ? (
                        "–"
                      ) : seeding ? (
                        <span className="text-neutral-400">
                          {t("transcode.admin.savedLater", {
                            size: formatBytes(diff),
                          })}
                        </span>
                      ) : (
                        <span className="text-emerald-300">
                          −{formatBytes(diff)}
                        </span>
                      )}
                    </td>
                    <td
                      className={cn(
                        "px-3 py-2 tabular-nums mobile-max:hidden",
                        j.status === "failed" &&
                          j.ssim_avg != null &&
                          "text-red-400",
                      )}
                    >
                      {j.ssim_avg?.toFixed(3) ?? "–"}
                    </td>
                    <td className="px-3 py-2 tabular-nums mobile-max:hidden">
                      {took != null ? formatDuration(took) : "–"}
                    </td>
                    <td className="px-2 text-right">
                      {j.status === "done" && seeding && (
                        <button
                          type="button"
                          onClick={() => freeSource(j.id, j.title)}
                          className="rounded px-1.5 py-1 text-neutral-400 hover:bg-neutral-950"
                        >
                          {t("transcode.admin.freeSource.button")}
                        </button>
                      )}
                      {(j.status === "failed" || j.status === "cancelled") && (
                        <button
                          type="button"
                          onClick={() => safe(act.retry(j.id))}
                          className="rounded px-1.5 py-1 text-neutral-400 hover:bg-neutral-950"
                        >
                          ↻ {t("transcode.admin.retry")}
                        </button>
                      )}
                      {(j.status === "failed" || j.status === "cancelled") && (
                        <button
                          type="button"
                          onClick={() => discard(j.id, j.title)}
                          className="rounded px-1.5 py-1 text-red-400 hover:bg-neutral-950"
                        >
                          {t("transcode.admin.discard.button")}
                        </button>
                      )}
                    </td>
                  </tr>
                  {j.error && j.status === "failed" && (
                    <tr className="border-b border-neutral-800">
                      <td
                        colSpan={7}
                        className="px-3 pb-2 text-xs text-red-400"
                      >
                        {j.error}
                      </td>
                    </tr>
                  )}
                </Fragment>
              );
            })}
          </tbody>
        </table>
      </section>
    </>
  );
}
