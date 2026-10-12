import { useMemo, useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useLibraryFiles } from "@/features/medias/hooks/useLibraryFiles";
import { useLibraryEpisodes } from "@/features/medias/hooks/useLibraryEpisodes";
import { useRescanLibraryItem } from "@/features/medias/hooks/useRescanLibraryItem";
import { useSearchLibraryEpisode } from "@/features/medias/hooks/useSearchLibraryEpisode";
import { useSearchSeasonPack } from "@/features/medias/hooks/useSearchSeasonPack";
import { useRetrySkippedMedia } from "@/features/medias/hooks/useRetrySkippedMedia";
import { useRetrySkippedSeason } from "@/features/medias/hooks/useRetrySkippedSeason";
import { useToggleEpisodeMonitored } from "@/features/medias/hooks/useToggleEpisodeMonitored";
import { useToggleSeasonMonitored } from "@/features/medias/hooks/useToggleSeasonMonitored";
import { useDeleteLibraryEpisode } from "@/features/medias/hooks/useDeleteLibraryEpisode";
import { useDeleteLibraryFile } from "@/features/medias/hooks/useDeleteLibraryFile";
import type { LibraryFileInfo } from "@rawkoon/shared/types";
import { Folder, Gauge, RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";
import { Card } from "./LibrarySharedUI";
import { getMappedFolder } from "@/utils/libraryDisplayUtils";
import { LibraryShowSeason } from "./LibraryShowSeason";
import { LibraryFilesBySeason } from "./LibraryFilesBySeason";
import { LibraryMovieFiles } from "./LibraryMovieFiles";
import { ReencodeModal } from "@/features/transcode/ReencodeModal";

interface LibraryMediaSectionProps {
  libraryId: number;
  onSearchEpisode?: (ep: {
    id: number;
    season: number;
    episode: number;
    title: string | null;
  }) => void;
  onSearchSeason?: (season: number) => void;
  focusSeason?: number | null;
  focusEpisode?: number | null;
}

export function LibraryMediaSection({
  libraryId,
  onSearchEpisode,
  onSearchSeason,
  focusSeason = null,
  focusEpisode = null,
}: LibraryMediaSectionProps) {
  const { t } = useTranslation("common");
  const { data, isLoading } = useLibraryFiles(libraryId);
  const rescan = useRescanLibraryItem(libraryId);
  const deleteFile = useDeleteLibraryFile(libraryId);
  const deleteEpisodeMut = useDeleteLibraryEpisode(libraryId);
  const searchEpMut = useSearchLibraryEpisode();
  const searchSeasonPackMut = useSearchSeasonPack();
  const retryEpMut = useRetrySkippedMedia();
  const retrySeasonMut = useRetrySkippedSeason();
  const toggleEpMonitoredMut = useToggleEpisodeMonitored();
  const toggleSeasonMonitoredMut = useToggleSeasonMonitored();
  const [deleteConfirmId, setDeleteConfirmId] = useState<number | null>(null);
  const [reencode, setReencode] = useState<{ season: number | null } | null>(
    null,
  );
  const [expandedSeasons, setExpandedSeasons] = useState<Set<number>>(
    new Set(),
  );

  const files = useMemo(() => data?.files ?? [], [data?.files]);
  const isShow = data?.media_type === "show";
  const episodesQuery = useLibraryEpisodes(isShow ? libraryId : null);

  useEffect(() => {
    if (focusSeason == null) return;
    setExpandedSeasons((prev) => new Set(prev).add(focusSeason));
    if (focusEpisode == null) return;
    const id = `library-episode-${focusSeason}-${focusEpisode}`;
    requestAnimationFrame(() => {
      document.getElementById(id)?.scrollIntoView({ block: "nearest" });
    });
  }, [focusSeason, focusEpisode, episodesQuery.data]);

  const fileByEp = useMemo(() => {
    const m = new Map<string, LibraryFileInfo>();
    for (const f of files) {
      if (f.season != null && f.episode != null) {
        m.set(`${f.season}_${f.episode}`, f);
      }
    }
    return m;
  }, [files]);

  const hasEpisodes = isShow && episodesQuery.data != null;

  const toggleSeason = (season: number) =>
    setExpandedSeasons((prev) => {
      const next = new Set(prev);
      if (next.has(season)) {
        next.delete(season);
      } else {
        next.add(season);
      }
      return next;
    });

  if (isLoading) {
    return (
      <div className="px-5 py-10 text-center text-sm text-neutral-500">
        {t("library.media.loadingFileInfo")}
      </div>
    );
  }

  const mappedFolder = files.length ? getMappedFolder(files, isShow) : null;

  return (
    <Card>
      {/* Header — always visible */}
      <div className="flex items-center gap-2 px-4 py-3 border-b border-border">
        <div className="flex items-center gap-1.5 min-w-0 flex-1">
          <Folder size={13} className="text-neutral-400 shrink-0" />
          {mappedFolder && (
            <span className="text-[10px] font-mono text-neutral-400 truncate">
              {mappedFolder}
            </span>
          )}
        </div>
        <button
          type="button"
          onClick={() => setReencode({ season: null })}
          className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800 transition-colors shrink-0"
        >
          <Gauge size={10} />
          {isShow ? t("transcode.openShow") : t("transcode.openButton")}
        </button>
        <button
          onClick={() => rescan.mutate()}
          disabled={rescan.isPending}
          className={cn(
            "inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium transition-colors shrink-0",
            "text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800",
            "disabled:opacity-50 disabled:cursor-not-allowed",
          )}
        >
          <RefreshCw
            size={10}
            className={rescan.isPending ? "animate-spin" : ""}
          />
          {rescan.isPending
            ? "Rescanning…"
            : rescan.isSuccess
              ? `Done (${rescan.data?.rescanned})`
              : "Rescan files"}
        </button>
      </div>

      {isShow && episodesQuery.isLoading && (
        <div className="px-4 py-4 text-xs text-neutral-400">
          {t("library.media.loadingEpisodes")}
        </div>
      )}

      {!files.length && !hasEpisodes && !episodesQuery.isLoading && (
        <div className="px-4 py-4 text-xs text-neutral-500">
          {t("library.media.noFileMetadata")}
        </div>
      )}

      {isShow ? (
        /* Show: merged episodes + files by season */
        hasEpisodes ? (
          <div className="divide-y divide-border">
            {episodesQuery.data!.seasons.map((s) => (
              <LibraryShowSeason
                key={s.season}
                s={s}
                libraryId={libraryId}
                files={files}
                fileByEp={fileByEp}
                isExpanded={expandedSeasons.has(s.season)}
                toggleSeason={toggleSeason}
                setReencode={setReencode}
                t={t}
                onSearchEpisode={onSearchEpisode}
                onSearchSeason={onSearchSeason}
                searchEpMut={searchEpMut}
                searchSeasonPackMut={searchSeasonPackMut}
                retryEpMut={retryEpMut}
                retrySeasonMut={retrySeasonMut}
                toggleEpMonitoredMut={toggleEpMonitoredMut}
                toggleSeasonMonitoredMut={toggleSeasonMonitoredMut}
                deleteEpisodeMut={deleteEpisodeMut}
              />
            ))}
          </div>
        ) : (
          /* Episodes not loaded yet but files exist — group by season */
          <LibraryFilesBySeason
            files={files}
            expandedSeasons={expandedSeasons}
            toggleSeason={toggleSeason}
            t={t}
          />
        )
      ) : (
        /* Movie: flat */
        <LibraryMovieFiles
          files={files}
          deleteConfirmId={deleteConfirmId}
          setDeleteConfirmId={setDeleteConfirmId}
          deleteFile={deleteFile}
          t={t}
        />
      )}
      {reencode && (
        <ReencodeModal
          isOpen
          onClose={() => setReencode(null)}
          selection={{
            media_id: libraryId,
            ...(reencode.season != null ? { season: reencode.season } : {}),
          }}
          subtitle={
            reencode.season != null
              ? `${t("transcode.openSeason")} ${reencode.season}`
              : t("transcode.fileCount", { count: files.length })
          }
        />
      )}
    </Card>
  );
}
