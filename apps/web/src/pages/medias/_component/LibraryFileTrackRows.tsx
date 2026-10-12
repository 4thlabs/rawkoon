import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";
import type {
  LibraryAudioTrack,
  LibrarySubtitleTrack,
} from "@rawkoon/shared/types";
import { Badge } from "./LibrarySharedUI";
import { frenchLabel } from "@/utils/libraryDisplayUtils";

export function AudioTrackRow({ track }: { track: LibraryAudioTrack }) {
  const { t } = useTranslation("common");
  const frFlag = frenchLabel(track.language);
  const langDisplay = frFlag ?? track.language_name ?? track.language;
  const details = [
    track.codec,
    track.channel_layout ?? (track.channels ? `${track.channels}ch` : null),
    track.bitrate_kbps
      ? t("library.fileDetail.bitrateKbps", {
          value: track.bitrate_kbps.toLocaleString(),
        })
      : null,
  ]
    .filter(Boolean)
    .join(" · ");
  return (
    <div className="flex items-center gap-2 py-1">
      <span className="text-xs font-medium text-neutral-300 w-28 shrink-0 truncate">
        {langDisplay}
      </span>
      <span className="text-xs text-neutral-400 flex-1 truncate">
        {details || "—"}
      </span>
      <div className="flex gap-1 shrink-0">
        {track.default && (
          <Badge className="bg-primary-500/15 text-primary-300">
            {t("library.fileDetail.defaultTrack")}
          </Badge>
        )}
        {track.forced && (
          <Badge className="bg-neutral-700 text-neutral-300">
            {t("library.fileDetail.forced")}
          </Badge>
        )}
      </div>
    </div>
  );
}

export function SubtitleTrackRow({ track }: { track: LibrarySubtitleTrack }) {
  const { t } = useTranslation("common");
  const frFlag = frenchLabel(track.language);
  const langDisplay = frFlag ?? track.language_name ?? track.language;
  return (
    <div className="flex items-center gap-2 py-1">
      <span className="text-xs font-medium text-neutral-300 w-28 shrink-0 truncate">
        {langDisplay}
      </span>
      <span className="text-xs text-neutral-400 flex-1 truncate">
        {track.format ?? "—"}
        {track.title ? ` · ${track.title}` : ""}
      </span>
      <div className="flex gap-1 shrink-0">
        {track.forced && (
          <Badge className="bg-neutral-700 text-neutral-300">
            {t("library.fileDetail.forced")}
          </Badge>
        )}
        {track.hearing_impaired && (
          <Badge className="bg-neutral-700 text-neutral-400">
            {t("library.fileDetail.hearingImpaired")}
          </Badge>
        )}
      </div>
    </div>
  );
}

export function TrackToggleRow({
  kept,
  disabled,
  onToggle,
  lang,
  details,
}: {
  kept: boolean;
  disabled: boolean;
  onToggle: () => void;
  lang: string | null | undefined;
  details: string;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onToggle}
      className={cn(
        "w-full flex items-center gap-2 rounded px-2 py-1.5 text-left transition-colors",
        kept
          ? "bg-neutral-700 border border-neutral-600"
          : "bg-transparent border border-dashed border-neutral-600 opacity-50",
        disabled && "cursor-not-allowed",
      )}
    >
      <span
        className={cn(
          "w-3 h-3 rounded-sm border shrink-0 flex items-center justify-center transition-colors",
          kept ? "bg-white border-white" : "border-neutral-500",
        )}
      >
        {kept && (
          <svg
            className="w-2 h-2 text-neutral-900"
            viewBox="0 0 8 8"
            fill="none"
          >
            <path
              d="M1.5 4L3 5.5L6.5 2"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        )}
      </span>
      <span className="text-xs font-medium text-neutral-300 w-24 shrink-0 truncate">
        {lang}
      </span>
      <span className="text-xs text-neutral-400 truncate">{details}</span>
    </button>
  );
}
