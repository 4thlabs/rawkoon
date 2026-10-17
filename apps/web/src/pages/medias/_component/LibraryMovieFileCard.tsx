import { useState } from "react";
import { useTranslation } from "react-i18next";
import { ChevronRight, Film, Gauge, Shuffle, Trash2 } from "lucide-react";
import type {
  LibraryAudioTrack,
  LibraryFileInfo,
  LibrarySubtitleTrack,
} from "@rawkoon/shared/types";
import type { useDeleteLibraryFile } from "@/features/medias/hooks/useDeleteLibraryFile";
import { ReencodeModal } from "@/features/transcode/ReencodeModal";
import { cn } from "@/lib/utils";
import { formatBytes } from "@/lib/utils/format";
import { frenchLabel } from "@/utils/libraryDisplayUtils";
import { Card } from "./LibrarySharedUI";
import { FileDetailBlock } from "./LibraryFileDetailBlock";
import { RemuxPanel } from "./LibraryRemuxPanel";

const ACTION =
  "focus-ring inline-flex min-h-9 items-center gap-1.5 rounded-lg px-2.5 text-sm text-neutral-300 transition-colors hover:bg-neutral-800 hover:text-neutral-100";

function audioChipLabel(track: LibraryAudioTrack): string {
  const language = frenchLabel(track.language)
    ? track.language.toUpperCase()
    : (track.language_name ?? track.language);
  const layout =
    track.channel_layout ?? (track.channels ? `${track.channels}ch` : null);
  return [language, track.codec?.toUpperCase(), layout]
    .filter(Boolean)
    .join(" · ");
}

interface LibraryMovieFileCardProps {
  file: LibraryFileInfo;
  confirmingDelete: boolean;
  setConfirmingDelete: (confirming: boolean) => void;
  deleteFile: ReturnType<typeof useDeleteLibraryFile>;
}

/** One movie file: what it is, its audio at a glance, and everything else behind "Media details". */
export function LibraryMovieFileCard({
  file,
  confirmingDelete,
  setConfirmingDelete,
  deleteFile,
}: LibraryMovieFileCardProps) {
  const { t } = useTranslation("common");
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [reencodeOpen, setReencodeOpen] = useState(false);
  const [remuxOpen, setRemuxOpen] = useState(false);

  const audio = (file.audio_tracks ?? []) as LibraryAudioTrack[];
  const subtitles = (file.subtitle_tracks ?? []) as LibrarySubtitleTrack[];
  const canRemux =
    file.file_name.toLowerCase().endsWith(".mkv") && audio.length > 1;
  const summary = [
    formatBytes(Number(file.size_bytes)),
    file.resolution ? `${file.resolution}p` : null,
    file.video_codec,
    file.source,
    file.release_group,
  ].filter(Boolean);
  const scanned = new Date(file.scanned_at).toLocaleDateString(undefined, {
    dateStyle: "medium",
  });

  return (
    <Card>
      <div className="flex flex-wrap items-start gap-x-3 gap-y-2 px-4 pt-4">
        <span className="mt-0.5 grid size-9 shrink-0 place-items-center rounded-lg bg-neutral-800 text-neutral-400">
          <Film size={16} aria-hidden />
        </span>
        <div className="min-w-0 flex-1 basis-56">
          <p className="break-all font-mono text-[13px] leading-snug text-neutral-100">
            {file.file_name}
          </p>
          <p className="mt-1 text-sm text-neutral-400">
            {summary.map((part, i) => (
              <span key={i}>
                {i > 0 && <span aria-hidden> · </span>}
                <span className={i === 0 ? "font-mono text-[13px]" : undefined}>
                  {part}
                </span>
              </span>
            ))}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-1">
          <button
            type="button"
            onClick={() => setReencodeOpen(true)}
            className={ACTION}
          >
            <Gauge size={14} aria-hidden />
            {t("transcode.openButton")}
          </button>
          {canRemux && !remuxOpen && (
            <button
              type="button"
              onClick={() => setRemuxOpen(true)}
              className={ACTION}
            >
              <Shuffle size={14} aria-hidden />
              {t("library.fileDetail.remux.openButton")}
            </button>
          )}
          {!confirmingDelete && (
            <button
              type="button"
              onClick={() => setConfirmingDelete(true)}
              className={cn(ACTION, "hover:bg-red-950/30 hover:text-red-300")}
            >
              <Trash2 size={14} aria-hidden />
              {t("common.remove")}
            </button>
          )}
        </div>
      </div>

      {confirmingDelete && (
        <div className="mx-4 mt-3 flex flex-wrap items-center gap-2 rounded-lg border border-red-900/60 bg-red-950/15 px-3 py-2">
          <span className="mr-auto text-sm text-red-200">
            {t("library.media.deleteFileOnDisk")}
          </span>
          <button
            type="button"
            disabled={deleteFile.isPending}
            onClick={() =>
              deleteFile.mutate(
                { fileId: file.id, deleteFile: true },
                { onSettled: () => setConfirmingDelete(false) },
              )
            }
            className="focus-ring min-h-9 rounded-lg bg-red-600 px-3 text-sm font-medium text-white transition-colors hover:bg-red-500 disabled:opacity-50"
          >
            {t("library.media.yesDelete")}
          </button>
          <button
            type="button"
            disabled={deleteFile.isPending}
            onClick={() =>
              deleteFile.mutate(
                { fileId: file.id, deleteFile: false },
                { onSettled: () => setConfirmingDelete(false) },
              )
            }
            className="focus-ring min-h-9 rounded-lg bg-neutral-700 px-3 text-sm font-medium text-neutral-100 transition-colors hover:bg-neutral-600 disabled:opacity-50"
          >
            {t("library.media.keepFile")}
          </button>
          <button
            type="button"
            onClick={() => setConfirmingDelete(false)}
            className="focus-ring min-h-9 rounded-lg px-2 text-sm text-neutral-300 hover:text-neutral-100"
          >
            {t("common.cancel")}
          </button>
        </div>
      )}

      {(audio.length > 0 || subtitles.length > 0) && (
        <ul
          aria-label={t("library.files.tracks")}
          className="flex flex-wrap gap-1.5 px-4 pt-3"
        >
          {audio.map((track) => (
            <li
              key={track.index}
              className={cn(
                "rounded-full border px-2.5 py-1 font-mono text-xs",
                track.default
                  ? "border-primary-500/40 bg-primary-500/10 text-primary-200"
                  : "border-neutral-700 text-neutral-300",
              )}
              title={
                frenchLabel(track.language) ?? track.language_name ?? undefined
              }
            >
              {audioChipLabel(track)}
              {track.default && (
                <span className="font-sans text-neutral-400">
                  {" · "}
                  {t("library.fileDetail.defaultTrack")}
                </span>
              )}
            </li>
          ))}
          {subtitles.length > 0 && (
            <li className="rounded-full border border-neutral-800 px-2.5 py-1 text-xs text-neutral-400">
              {t("library.files.subtitleCount", { count: subtitles.length })}
            </li>
          )}
        </ul>
      )}

      <div className="mt-3 border-t border-neutral-800">
        <button
          type="button"
          aria-expanded={detailsOpen}
          onClick={() => setDetailsOpen((open) => !open)}
          className="focus-ring flex min-h-11 w-full items-center gap-2 px-4 text-left text-sm text-neutral-300 transition-colors hover:bg-neutral-800/40"
        >
          <ChevronRight
            size={14}
            aria-hidden
            className={cn(
              "text-neutral-400 transition-transform motion-reduce:transition-none",
              detailsOpen && "rotate-90",
            )}
          />
          {t("library.files.mediaDetails")}
          <span className="ml-auto text-xs text-neutral-400">
            {t("library.fileDetail.scanned", { date: scanned })}
          </span>
        </button>
        {detailsOpen && (
          <div className="px-4 pb-4">
            <FileDetailBlock file={file} showActions={false} />
          </div>
        )}
      </div>

      {remuxOpen && (
        <div className="border-t border-neutral-800 px-4 py-3">
          <RemuxPanel file={file} onClose={() => setRemuxOpen(false)} />
        </div>
      )}
      <ReencodeModal
        isOpen={reencodeOpen}
        onClose={() => setReencodeOpen(false)}
        selection={{ file_ids: [file.id] }}
        subtitle={file.file_name}
      />
    </Card>
  );
}
