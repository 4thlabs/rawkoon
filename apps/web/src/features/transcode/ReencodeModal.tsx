import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import type {
  TranscodeCodec,
  TranscodeEncoder,
  TranscodeEstimate,
  TranscodeJobSettings,
  TranscodeSelection,
} from "@rawkoon/shared/types";
import { Dialog } from "@/components/dialog";
import { AudioSection } from "@/features/transcode/AudioSection";
import { EstimatePanel } from "@/features/transcode/EstimatePanel";
import { settingsKey, targetKbpsFromGb } from "@/features/transcode/format";
import {
  useEnqueueTranscode,
  useRefineTranscodeEstimate,
  useTranscodeCapabilities,
  useTranscodeEstimate,
} from "@/features/transcode/hooks";
import { SizeSection } from "@/features/transcode/SizeSection";
import { useDebounced } from "@/features/transcode/useDebounced";
import { VideoSection } from "@/features/transcode/VideoSection";

const DEFAULT: TranscodeJobSettings = {
  codec: "hevc",
  encoder: "software",
  resolution: "keep",
  mode: "quality",
  preset: "balanced",
  speed: "default",
  convertLosslessAudio: false,
};

export function ReencodeModal({
  isOpen,
  onClose,
  selection,
  subtitle,
}: {
  isOpen: boolean;
  onClose: () => void;
  selection: TranscodeSelection;
  subtitle: string;
}) {
  const { t } = useTranslation("common");
  const [s, setS] = useState<TranscodeJobSettings>(DEFAULT);
  const [gbPerFile, setGbPerFile] = useState(1.5);
  const [refined, setRefined] = useState<{
    key: string;
    data: TranscodeEstimate;
  } | null>(null);
  const caps = useTranscodeCapabilities(isOpen);
  const refine = useRefineTranscodeEstimate();
  const enqueue = useEnqueueTranscode();

  const has = (codec: TranscodeCodec, encoder: TranscodeEncoder) =>
    caps.data?.combos.some((c) => c.codec === codec && c.encoder === encoder) ??
    false;
  const gpuAvailable = has(s.codec, "vaapi");

  // Target mode needs the batch's duration/audio from a quality-mode estimate first.
  const baseEstimate = useTranscodeEstimate(
    selection,
    { ...s, mode: "quality", targetVideoKbps: undefined },
    isOpen,
  );
  const base = baseEstimate.data;
  const effective: TranscodeJobSettings = useMemo(() => {
    if (s.mode !== "target" || !base) return s;
    return {
      ...s,
      targetVideoKbps: targetKbpsFromGb(
        gbPerFile,
        base.files.length,
        Number(base.total_audio_bytes),
        base.total_duration_secs,
      ),
    };
  }, [s, base, gbPerFile]);
  const debounced = useDebounced(effective, 300);
  const live = useTranscodeEstimate(
    selection,
    debounced,
    isOpen &&
      (debounced.mode === "quality" || debounced.targetVideoKbps != null),
  );

  const key = settingsKey(effective);
  const est =
    refined && refined.key === key ? refined.data : (live.data ?? base);
  const outdated = refined != null && refined.key !== key;
  const sourceHeight = est?.source_height ?? null;
  const sourceWidth = est?.source_width ?? null;
  // Mirrors the API: a downscale applies only when the source does not already fit the target box.
  const fits = (bw: number, bh: number) =>
    sourceHeight != null &&
    sourceHeight <= bh &&
    (sourceWidth == null || sourceWidth <= bw);
  const count = est?.files.length ?? 0;
  const seeding = est?.files.filter((f) => f.nlink > 1).length ?? 0;
  const set = <K extends keyof TranscodeJobSettings>(
    k: K,
    v: TranscodeJobSettings[K],
  ) => setS((p) => ({ ...p, [k]: v }));

  const onRefine = async () => {
    try {
      const data = await refine.mutateAsync({ selection, settings: effective });
      setRefined({ key, data });
    } catch {
      toast.error(t("transcode.refineFailed"));
    }
  };

  const onSubmit = async () => {
    try {
      const r = await enqueue.mutateAsync({ selection, settings: effective });
      toast.success(t("transcode.queued", { count: r.count }));
      onClose();
    } catch {
      toast.error(t("transcode.queueFailed"));
    }
  };

  const saved = est
    ? Number(est.total_source_bytes) - Number(est.total_estimated_bytes)
    : 0;
  const nowPct =
    est && Number(est.total_source_bytes)
      ? (Number(est.frees_now_bytes) / Number(est.total_source_bytes)) * 100
      : 0;
  const laterPct =
    est && Number(est.total_source_bytes)
      ? (Number(est.frees_after_seeding_bytes) /
          Number(est.total_source_bytes)) *
        100
      : 0;
  const sourceLine =
    est?.source === "target"
      ? t("transcode.estimate.target")
      : outdated
        ? t("transcode.estimate.outdated")
        : est?.source === "refined"
          ? t("transcode.estimate.refined", {
              files: est.refined_files,
              clips: est.refined_clips,
            })
          : t("transcode.estimate.rough");

  return (
    <Dialog
      isOpen={isOpen}
      onClose={onClose}
      title={t("transcode.title")}
      panelClassName="max-w-[560px] p-0"
      bodyScroll
    >
      <div className="flex min-h-0 flex-col">
        <p className="px-5 pb-3 text-[13px] text-neutral-400">{subtitle}</p>
        <div className="min-h-0 overflow-y-auto px-5">
          <VideoSection
            s={s}
            setS={setS}
            set={set}
            has={has}
            gpuAvailable={gpuAvailable}
            caps={caps}
            sourceHeight={sourceHeight}
            fits={fits}
          />

          <SizeSection
            s={s}
            setS={setS}
            set={set}
            gbPerFile={gbPerFile}
            setGbPerFile={setGbPerFile}
            effective={effective}
          />

          <AudioSection s={s} set={set} est={est} />

          {est && est.excluded.length > 0 && (
            <details className="mb-3 rounded-lg border border-neutral-800 px-3 py-2 text-xs text-neutral-400">
              <summary className="cursor-pointer">
                {t("transcode.excludedTitle", { count: est.excluded.length })}
              </summary>
              <ul className="mt-1.5 space-y-0.5">
                {est.excluded.map((x) => (
                  <li key={x.file_id}>
                    {x.title} — {x.reason}
                  </li>
                ))}
              </ul>
            </details>
          )}
        </div>

        <EstimatePanel
          est={est}
          s={s}
          saved={saved}
          nowPct={nowPct}
          laterPct={laterPct}
          seeding={seeding}
          outdated={outdated}
          sourceLine={sourceLine}
          refining={refine.isPending}
          refined={refined != null}
          count={count}
          onRefine={onRefine}
        />

        <div className="flex justify-end gap-2 px-5 pb-5 pt-4">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg px-4 py-2 text-sm font-semibold text-neutral-200"
          >
            {t("transcode.cancel")}
          </button>
          <button
            type="button"
            onClick={onSubmit}
            disabled={count === 0 || enqueue.isPending}
            className="rounded-lg bg-primary-600 px-4 py-2 text-sm font-semibold text-[#2A1A10] hover:bg-primary-500 disabled:opacity-50"
          >
            {t("transcode.submit", { count })}
          </button>
        </div>
      </div>
    </Dialog>
  );
}
