import { useState } from "react";
import {
  Ban,
  Check,
  Download,
  Gauge,
  MoreHorizontal,
  Sparkles,
  Trophy,
} from "lucide-react";
import type { InteractiveReleaseItem } from "@rawkoon/shared/types";
import { formatBytes } from "@/lib/utils/format";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  bestMatchReasons,
  type BestMatchReason,
} from "@/features/medias/lib/bestMatch";
import { codeKey, REJECTION_CODE_KEYS } from "@/lib/i18n/scoringCodes";
import { ScoreBreakdownPanel } from "@/pages/medias/_component/ScoreBreakdownPanel";

/** Insert <wbr> after dots so long release titles can wrap on mobile. */
function BreakableTitle({ text }: { text: string }) {
  const parts = text.split(".");
  return (
    <>
      {parts.map((part, i) => (
        <span key={i}>
          {i > 0 && "."}
          {i > 0 && <wbr />}
          {part}
        </span>
      ))}
    </>
  );
}

export function ReleaseCard({
  release,
  onDownload,
  onBlock,
  isDownloading,
  isBusy,
  isBlocking = false,
  blocked = false,
  alreadyGrabbed = false,
  isAiPick = false,
  replaceRunning = false,
  variant = "row",
  profileName = null,
  t,
}: {
  release: InteractiveReleaseItem;
  onDownload: () => void;
  onBlock?: () => void;
  isDownloading: boolean;
  isBusy: boolean;
  isBlocking?: boolean;
  blocked?: boolean;
  alreadyGrabbed?: boolean;
  isAiPick?: boolean;
  /** A download is running: grabbing this release replaces it, after a confirm tap. */
  replaceRunning?: boolean;
  /** "best" pins the release a profile search would pick, with the reasons it won. */
  variant?: "row" | "best";
  profileName?: string | null;
  t: (key: string, options?: Record<string, unknown>) => string;
}) {
  const [showBreakdown, setShowBreakdown] = useState(false);
  const [confirmingReplace, setConfirmingReplace] = useState(false);
  const grabDisabled =
    isBusy || (!release.download_url && !release.download_token);
  // A language fallback is rejected for grabbing automatically, but offered here.
  const showRejected = release.rejected && !release.language_fallback;
  const isBest = variant === "best";
  const canShowBreakdown =
    !release.rejected &&
    release.score_breakdown != null &&
    !release.score_breakdown.rejected;
  const [menuOpen, setMenuOpen] = useState(false);
  const profile = profileName ?? t("medias.interactive.profileFallback");
  const reasons = isBest ? bestMatchReasons(release) : [];
  return (
    <div
      className={`rounded-2xl border p-3 transition-colors ${
        isBest
          ? "border-primary-500/40 bg-primary-950/20"
          : showRejected
            ? "border-amber-700/30 bg-amber-950/20"
            : "border-neutral-700/80 bg-neutral-900/60 hover:bg-neutral-900"
      }`}
    >
      {isBest && (
        <div className="mb-2.5 space-y-1.5">
          <p className="flex items-center gap-1.5 text-xs font-semibold text-primary-300">
            <Trophy size={13} aria-hidden="true" />
            {profileName
              ? t(
                  isAiPick
                    ? "medias.interactive.bestMatch.titleAi"
                    : "medias.interactive.bestMatch.title",
                  { profile: profileName },
                )
              : t(
                  isAiPick
                    ? "medias.interactive.bestMatch.titleAiNoProfile"
                    : "medias.interactive.bestMatch.titleNoProfile",
                )}
          </p>
          {reasons.length > 0 && (
            <ul className="flex flex-wrap gap-x-3 gap-y-1">
              {reasons.map((reason) => (
                <li
                  key={reason.key}
                  className="flex items-center gap-1 text-xs text-neutral-300"
                >
                  <Check
                    size={11}
                    className="shrink-0 text-primary-400"
                    aria-hidden="true"
                  />
                  {reasonText(reason, t)}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium leading-snug text-white">
            {release.info_url ? (
              <a
                href={release.info_url}
                target="_blank"
                rel="noopener noreferrer"
                className="transition-colors hover:underline hover:text-primary-400"
              >
                <BreakableTitle text={release.title} />
              </a>
            ) : (
              <BreakableTitle text={release.title} />
            )}
          </p>

          <div className="mt-2 flex flex-wrap gap-1.5">
            {isAiPick && (
              <span className="inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[10px] font-semibold bg-violet-500/15 text-violet-300">
                <Sparkles className="h-2.5 w-2.5" />
                AI Pick
              </span>
            )}
            {release.is_complete_series && (
              <span className="inline-flex items-center rounded-md px-2 py-0.5 text-[10px] font-semibold bg-violet-500/15 text-violet-300">
                Intégrale
              </span>
            )}
            {release.is_season_pack && !release.is_complete_series && (
              <span className="inline-flex items-center rounded-md px-2 py-0.5 text-[10px] font-semibold bg-violet-500/15 text-violet-300">
                Season pack
              </span>
            )}
            {release.language_fallback_tag && (
              <span className="inline-flex items-center rounded-md px-2 py-0.5 text-[10px] font-semibold bg-violet-500/15 text-violet-300">
                {release.language_fallback_tag}
              </span>
            )}
            {release.indexer && (
              <span className="inline-flex items-center rounded-md px-2 py-0.5 text-[10px] font-medium bg-neutral-800 text-neutral-400">
                {release.indexer}
              </span>
            )}
            {release.size_bytes != null && (
              <span className="inline-flex items-center rounded-md px-2 py-0.5 text-[10px] font-medium bg-sky-950/40 text-sky-300">
                {formatBytes(release.size_bytes)}
              </span>
            )}
            {release.parsed_quality && (
              <span className="inline-flex items-center rounded-md px-2 py-0.5 text-[10px] font-medium bg-primary-950/40 text-primary-200">
                {[
                  release.parsed_quality.resolution
                    ? `${release.parsed_quality.resolution}p`
                    : null,
                  release.parsed_quality.source,
                  release.parsed_quality.codec,
                ]
                  .filter(Boolean)
                  .join(" · ")}
              </span>
            )}
            {release.parsed_quality?.hdr && (
              <span className="inline-flex items-center rounded-md px-2 py-0.5 text-[10px] font-semibold bg-amber-950/40 text-amber-300">
                {release.parsed_quality.hdr}
              </span>
            )}
            {release.freeleech && (
              <span className="inline-flex items-center rounded-md px-2 py-0.5 text-[10px] font-semibold bg-green-500/15 text-green-300">
                FL
              </span>
            )}
            {release.quality_score != null && (
              <span className="inline-flex items-center rounded-md px-2 py-0.5 text-[10px] font-medium bg-emerald-950/40 text-emerald-200">
                {t("medias.interactive.profileScore", {
                  score: release.quality_score,
                })}
              </span>
            )}
            {release.age != null && (
              <span className="inline-flex items-center rounded-md px-2 py-0.5 text-[10px] font-medium bg-neutral-800 text-neutral-400">
                {t("medias.interactive.age", { age: release.age })}
              </span>
            )}
            {(release.seeders != null || release.leechers != null) && (
              <span className="inline-flex items-center rounded-md px-2 py-0.5 text-[10px] font-medium bg-emerald-950/40 text-emerald-300">
                {t("medias.interactive.seedersLeechers", {
                  seeders: release.seeders ?? "-",
                  leechers: release.leechers ?? "-",
                })}
              </span>
            )}
            {release.languages.length > 0 && (
              <span className="inline-flex items-center rounded-md px-2 py-0.5 text-[10px] font-medium bg-violet-950/40 text-violet-300">
                {release.languages.join(", ")}
              </span>
            )}
          </div>

          {showRejected &&
            release.quality_rejection_reasons != null &&
            release.quality_rejection_reasons.length > 0 && (
              <div className="mt-2 rounded-md px-2 py-1 text-xs bg-amber-900/20 text-amber-400">
                {release.quality_rejection_reasons.map((code) => (
                  <p key={code}>
                    {t(codeKey(REJECTION_CODE_KEYS, code), { profile })}
                  </p>
                ))}
              </div>
            )}

          {showBreakdown && release.score_breakdown && canShowBreakdown && (
            <ScoreBreakdownPanel breakdown={release.score_breakdown} />
          )}
        </div>

        <div className="flex w-full items-center gap-1.5 sm:w-auto sm:shrink-0">
          <Button
            type="button"
            size="sm"
            variant={isBest ? "default" : "secondary"}
            onClick={() => {
              if (replaceRunning && !confirmingReplace) {
                setConfirmingReplace(true);
                return;
              }
              setConfirmingReplace(false);
              onDownload();
            }}
            onBlur={() => setConfirmingReplace(false)}
            disabled={grabDisabled}
            style={{ touchAction: "manipulation" }}
            className="flex-1 gap-1.5 sm:flex-none"
          >
            <Download size={11} strokeWidth={2.5} />
            {isDownloading
              ? t("medias.interactive.downloading")
              : replaceRunning
                ? t(
                    confirmingReplace
                      ? "medias.interactive.replaceConfirm"
                      : "medias.interactive.replace",
                  )
                : alreadyGrabbed
                  ? t("medias.interactive.redownload")
                  : t("medias.interactive.download")}
          </Button>
          {(onBlock || canShowBreakdown) && (
            <Popover open={menuOpen} onOpenChange={setMenuOpen}>
              <PopoverTrigger asChild>
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  aria-label={t("medias.interactive.moreActions")}
                  style={{ touchAction: "manipulation" }}
                  className="w-9 px-0"
                >
                  <MoreHorizontal size={16} />
                </Button>
              </PopoverTrigger>
              <PopoverContent align="end" className="w-52 p-1">
                {canShowBreakdown && (
                  <button
                    type="button"
                    onClick={() => {
                      setShowBreakdown((v) => !v);
                      setMenuOpen(false);
                    }}
                    className="focus-ring flex w-full items-center gap-2 rounded px-2.5 py-2 text-left text-sm text-neutral-100 hover:bg-neutral-700"
                  >
                    <Gauge size={13} aria-hidden="true" />
                    {t("customFormats.scoreBreakdown")}
                  </button>
                )}
                {onBlock && (
                  <button
                    type="button"
                    onClick={() => {
                      setMenuOpen(false);
                      onBlock();
                    }}
                    disabled={isBlocking || blocked}
                    title={t("medias.interactive.blockTitle")}
                    className="focus-ring flex w-full items-center gap-2 rounded px-2.5 py-2 text-left text-sm text-neutral-100 hover:bg-neutral-700 disabled:opacity-50"
                  >
                    <Ban size={13} aria-hidden="true" />
                    {blocked
                      ? t("medias.interactive.blocked")
                      : t("medias.interactive.block")}
                  </button>
                )}
              </PopoverContent>
            </Popover>
          )}
        </div>
      </div>
    </div>
  );
}

function reasonText(
  reason: BestMatchReason,
  t: (key: string, options?: Record<string, unknown>) => string,
): string {
  switch (reason.key) {
    case "quality":
      return t("medias.interactive.bestMatch.reasonQuality", {
        quality: reason.quality,
      });
    case "language":
      return reason.languages
        ? t("medias.interactive.bestMatch.reasonLanguage", {
            languages: reason.languages,
          })
        : t("medias.interactive.bestMatch.reasonLanguageAny");
    case "tracker":
      return t("medias.interactive.bestMatch.reasonTracker", {
        indexer: reason.indexer,
      });
    case "seeders":
      return t("medias.interactive.bestMatch.reasonSeeders", {
        count: reason.count,
      });
    case "size":
      return t("medias.interactive.bestMatch.reasonSize", {
        size: formatBytes(reason.size),
      });
  }
}
