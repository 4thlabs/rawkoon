import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import type {
  LibraryAudioTrack,
  LibraryFileInfo,
  LibrarySubtitleTrack,
} from "@rawkoon/shared/types";
import { frenchLabel } from "@/utils/libraryDisplayUtils";
import { useRemuxFile } from "@/features/medias/hooks/useRemuxFile";
import { useRemuxFileStatus } from "@/features/medias/hooks/useRemuxFileStatus";
import { useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/lib/queryKeys";
import { TrackToggleRow } from "./LibraryFileTrackRows";

export function RemuxPanel({
  file,
  onClose,
}: {
  file: LibraryFileInfo;
  onClose: () => void;
}) {
  const { t } = useTranslation("common");
  const audioTracks = (file.audio_tracks ?? []) as LibraryAudioTrack[];
  const subtitleTracks = (file.subtitle_tracks ?? []) as LibrarySubtitleTrack[];

  const [keptIndices, setKeptIndices] = useState<Set<number>>(
    () => new Set(audioTracks.map((tr) => tr.index)),
  );
  const [keptSubIndices, setKeptSubIndices] = useState<Set<number>>(
    () => new Set(subtitleTracks.map((tr) => tr.index)),
  );

  const queryClient = useQueryClient();
  const remuxMut = useRemuxFile(file.id);
  const { data: status } = useRemuxFileStatus(file.id);
  const isRunning = status?.state === "active" || status?.state === "waiting";
  const wasRunningRef = useRef(false);

  useEffect(() => {
    if (isRunning) wasRunningRef.current = true;
  }, [isRunning]);

  useEffect(() => {
    if (!wasRunningRef.current) return;
    if (status?.state === "completed") {
      void queryClient.invalidateQueries({ queryKey: queryKeys.library.all });
      if (status.result?.status === "remuxed") {
        toast.success(t("library.fileDetail.remux.done"));
      } else if (status.result?.status === "skipped") {
        toast.info(t("library.fileDetail.remux.skipped"));
      } else {
        toast.error(
          status.result?.message ?? t("library.fileDetail.remux.error"),
        );
      }
      onClose();
    } else if (status?.state === "failed") {
      void queryClient.invalidateQueries({ queryKey: queryKeys.library.all });
      toast.error(status.error ?? t("library.fileDetail.remux.error"));
      onClose();
    }
  }, [onClose, queryClient, status, t]);

  const toggleAudio = (index: number) => {
    setKeptIndices((prev) => {
      const next = new Set(prev);
      if (next.has(index)) {
        if (next.size <= 1) return prev;
        next.delete(index);
      } else {
        next.add(index);
      }
      return next;
    });
  };

  const toggleSub = (index: number) => {
    setKeptSubIndices((prev) => {
      const next = new Set(prev);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      return next;
    });
  };

  const onStart = async () => {
    try {
      await remuxMut.mutateAsync({
        keep_audio_track_indices: [...keptIndices],
        keep_subtitle_track_indices: [...keptSubIndices],
      });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : String(e));
    }
  };

  return (
    <div className="mt-3 rounded-lg border border-border bg-neutral-800/50 p-3 space-y-3">
      <p className="text-[11px] font-semibold text-neutral-300 uppercase tracking-wide">
        {t("library.fileDetail.remux.title")}
      </p>

      <div className="space-y-3">
        <div className="space-y-1">
          <p className="text-[11px] text-neutral-400 mb-1.5">
            {t("library.fileDetail.remux.keepAudioTracks")}
          </p>
          {audioTracks.map((tr) => {
            const langDisplay =
              frenchLabel(tr.language) ?? tr.language_name ?? tr.language;
            const details = [
              tr.codec,
              tr.channel_layout ?? (tr.channels ? `${tr.channels}ch` : null),
            ]
              .filter(Boolean)
              .join(" · ");
            const kept = keptIndices.has(tr.index);
            return (
              <TrackToggleRow
                key={tr.index}
                kept={kept}
                disabled={isRunning}
                onToggle={() => toggleAudio(tr.index)}
                lang={langDisplay}
                details={details}
              />
            );
          })}
        </div>

        {subtitleTracks.length > 0 && (
          <div className="space-y-1">
            <p className="text-[11px] text-neutral-400 mb-1.5">
              {t("library.fileDetail.remux.keepSubtitleTracks")}
            </p>
            {subtitleTracks.map((tr) => {
              const langDisplay =
                frenchLabel(tr.language) ?? tr.language_name ?? tr.language;
              const details = [
                tr.format,
                tr.forced ? t("library.fileDetail.forced") : null,
                tr.hearing_impaired
                  ? t("library.fileDetail.hearingImpaired")
                  : null,
              ]
                .filter(Boolean)
                .join(" · ");
              const kept = keptSubIndices.has(tr.index);
              return (
                <TrackToggleRow
                  key={tr.index}
                  kept={kept}
                  disabled={isRunning}
                  onToggle={() => toggleSub(tr.index)}
                  lang={langDisplay}
                  details={details}
                />
              );
            })}
          </div>
        )}
      </div>

      <div className="flex items-center gap-2 pt-1">
        {isRunning ? (
          <span className="text-xs text-neutral-400">
            {t("library.fileDetail.remux.running")}
          </span>
        ) : (
          <>
            <button
              type="button"
              onClick={() => void onStart()}
              disabled={remuxMut.isPending || keptIndices.size === 0}
              className="rounded px-2.5 py-1 text-xs font-medium bg-white text-neutral-900 hover:bg-neutral-200 disabled:opacity-50 transition-colors"
            >
              {t("library.fileDetail.remux.startButton")}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="text-xs text-neutral-400 hover:text-neutral-300 transition-colors"
            >
              {t("common.cancel")}
            </button>
          </>
        )}
      </div>
    </div>
  );
}
