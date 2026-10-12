import { ChevronRight } from "lucide-react";
import type { useTranslation } from "react-i18next";
import type { LibraryFileInfo } from "@rawkoon/shared/types";
import { cn } from "@/lib/utils";
import { Badge } from "./LibrarySharedUI";
import { qualityBadges, isUniform } from "@/utils/libraryDisplayUtils";

interface LibraryFilesBySeasonProps {
  files: LibraryFileInfo[];
  expandedSeasons: Set<number>;
  toggleSeason: (season: number) => void;
  t: ReturnType<typeof useTranslation>["t"];
}

export function LibraryFilesBySeason({
  files,
  expandedSeasons,
  toggleSeason,
  t,
}: LibraryFilesBySeasonProps) {
  return (
    <div className="divide-y divide-border">
      {Array.from(
        files.reduce((map, f) => {
          const s = f.season ?? 0;
          if (!map.has(s)) map.set(s, []);
          map.get(s)!.push(f);
          return map;
        }, new Map<number, LibraryFileInfo[]>()),
      )
        .sort(([a], [b]) => a - b)
        .map(([season, sFiles]) => {
          const isExpanded = expandedSeasons.has(season);
          const uRes = isUniform(sFiles.map((f) => f.resolution));
          const uSrc = isUniform(sFiles.map((f) => f.source));
          const uCodec = isUniform(sFiles.map((f) => f.video_codec));
          const uHdr = isUniform(sFiles.map((f) => f.hdr_format));
          const uBitDepth = isUniform(sFiles.map((f) => f.bit_depth));
          const sznBadges = qualityBadges({
            resolution: uRes,
            source: uSrc,
            video_codec: uCodec,
            hdr_format: uHdr,
            bit_depth: uBitDepth,
          });

          return (
            <div key={season} className="border-b border-border last:border-0">
              <button
                type="button"
                onClick={() => toggleSeason(season)}
                className="w-full flex items-center gap-2.5 px-4 py-2.5 hover:bg-neutral-800/40 transition-colors text-left"
              >
                <ChevronRight
                  size={12}
                  className={cn(
                    "text-neutral-400 shrink-0 transition-transform duration-150",
                    isExpanded && "rotate-90",
                  )}
                />
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-semibold text-neutral-200 leading-tight">
                    {t("library.media.season")} {season}
                  </div>
                  <div className="text-[10px] text-neutral-500 leading-tight mt-0.5">
                    {t("library.media.filesCount", {
                      count: sFiles.length,
                    })}
                  </div>
                </div>
                <div className="flex gap-1 flex-wrap justify-end shrink-0">
                  {sznBadges.map((b) => (
                    <Badge key={b.label} className={b.cls}>
                      {b.label}
                    </Badge>
                  ))}
                </div>
              </button>
              {isExpanded && (
                <div className="divide-y divide-border border-t border-border">
                  {sFiles.map((f) => {
                    const epCode =
                      f.episode != null
                        ? `E${String(f.episode).padStart(2, "0")}`
                        : "?";
                    const fBadges = qualityBadges(f);
                    return (
                      <div
                        key={f.id}
                        className="border-b last:border-0 border-border"
                      >
                        <div className="flex items-center gap-2 px-4 py-2">
                          <span className="font-mono text-[10px] font-medium text-neutral-500 w-7 shrink-0">
                            {epCode}
                          </span>
                          <span className="text-[11px] text-neutral-300 flex-1 min-w-0 truncate">
                            {f.episode_title ?? f.file_name}
                          </span>
                          <div className="flex gap-0.5 shrink-0">
                            {fBadges.slice(0, 2).map((b) => (
                              <Badge
                                key={b.label}
                                className={cn(b.cls, "text-[9px] py-0")}
                              >
                                {b.label}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
    </div>
  );
}
