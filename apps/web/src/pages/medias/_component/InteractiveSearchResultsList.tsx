import { useState } from "react";
import { useTranslation } from "react-i18next";
import {
  ChevronDown,
  ChevronUp,
  Languages,
  RefreshCw,
  TriangleAlert,
} from "lucide-react";
import type {
  InteractiveReleaseItem,
  LanguageFallbackSummary,
} from "@rawkoon/shared/types";
import { ReleaseCard } from "./ReleaseCard";
import { Button } from "@/components/ui/button";
import { splitLanguageFallback } from "@/lib/utils/interactive-search";
import { joinLanguages } from "@/features/medias/lib/languageFallback";
import { pickBestMatch } from "@/features/medias/lib/bestMatch";

interface InteractiveSearchResultsListProps {
  releases: InteractiveReleaseItem[];
  isLoading: boolean;
  needsSearchQuery: boolean;
  errorMessage: string | null;
  grabBusy: boolean;
  pendingReleaseKey: string | null;
  grabbedTitles: Set<string>;
  onDownload: (release: InteractiveReleaseItem) => void;
  onBlock?: (release: InteractiveReleaseItem) => void;
  blockingReleaseKey?: string | null;
  blockedTitles?: Set<string>;
  onRefetch: () => void;
  totalReleases: number;
  isError: boolean;
  onResetView: () => void;
  aiPickKey?: string | null;
  languageFallbackSummary?: LanguageFallbackSummary | null;
  /** Quality profile the scores come from; names the pinned best match. */
  profileName?: string | null;
}

export function InteractiveSearchResultsList({
  releases,
  isLoading,
  needsSearchQuery,
  errorMessage,
  grabBusy,
  pendingReleaseKey,
  grabbedTitles,
  onDownload,
  onBlock,
  blockingReleaseKey,
  blockedTitles,
  onRefetch,
  totalReleases,
  isError,
  onResetView,
  aiPickKey,
  languageFallbackSummary = null,
  profileName = null,
}: InteractiveSearchResultsListProps) {
  const { t } = useTranslation("common");
  const [fallbackOpen, setFallbackOpen] = useState(false);
  const groups = splitLanguageFallback(releases);
  // Pinned first, so the main list below skips it.
  const bestMatch = pickBestMatch(groups.primary);
  const mainRows = groups.primary.filter((r) => r !== bestMatch);
  // With no preferred-language release the other versions lead, expanded.
  const leadWithFallback =
    languageFallbackSummary != null && groups.fallback.length > 0;
  const showFallbackGroup = leadWithFallback || fallbackOpen;

  const renderCard = (
    release: InteractiveReleaseItem,
    variant: "row" | "best" = "row",
  ) => {
    const releaseKey = `${release.guid}-${release.indexer_id ?? "x"}`;
    return (
      <ReleaseCard
        key={releaseKey}
        release={release}
        onDownload={() => void onDownload(release)}
        onBlock={onBlock ? () => void onBlock(release) : undefined}
        isDownloading={pendingReleaseKey === releaseKey}
        isBusy={grabBusy}
        isBlocking={blockingReleaseKey === releaseKey}
        blocked={
          blockedTitles?.has(release.title.trim().toLowerCase()) ?? false
        }
        alreadyGrabbed={grabbedTitles.has(release.title.trim().toLowerCase())}
        isAiPick={aiPickKey != null && release.guid === aiPickKey}
        variant={variant}
        profileName={profileName}
        t={t}
      />
    );
  };

  const familyKey = groups.kind === "french" ? "French" : "Other";
  const breakdown = groups.counts.map(([tag, n]) => `${tag} (${n})`).join(", ");
  const fallbackGroup =
    groups.fallback.length === 0 ? null : (
      <section
        aria-label={t(`medias.interactive.languageFallback.group${familyKey}`)}
        className={leadWithFallback ? "mb-4" : "mt-4"}
      >
        {leadWithFallback ? (
          <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-neutral-400">
            {t(`medias.interactive.languageFallback.group${familyKey}`)}
          </h3>
        ) : (
          <button
            type="button"
            onClick={() => setFallbackOpen((v) => !v)}
            aria-expanded={fallbackOpen}
            className="mb-2 flex w-full items-center justify-between gap-2 rounded-2xl border border-neutral-700/80 bg-neutral-900/40 px-3 py-2.5 text-left text-sm font-medium text-neutral-200 transition-colors hover:bg-neutral-900"
          >
            <span>
              {t(`medias.interactive.languageFallback.collapsed${familyKey}`, {
                count: groups.fallback.length,
              })}
              <span className="ml-2 text-xs font-normal text-neutral-400">
                {breakdown}
              </span>
            </span>
            {fallbackOpen ? (
              <ChevronUp className="h-4 w-4 shrink-0" />
            ) : (
              <ChevronDown className="h-4 w-4 shrink-0" />
            )}
          </button>
        )}
        {showFallbackGroup && (
          <div className="space-y-2">
            {groups.fallback.map((r) => renderCard(r))}
          </div>
        )}
      </section>
    );

  return (
    <div className="pt-4">
      {needsSearchQuery ? (
        <div className="flex h-full items-center justify-center py-8">
          <div className="max-w-md text-center text-sm text-neutral-400">
            {t("medias.interactive.minQuery")}
          </div>
        </div>
      ) : isLoading ? (
        <div className="flex h-full items-center justify-center py-8">
          <div className="text-sm text-neutral-400">
            {t("medias.interactive.loading")}
          </div>
        </div>
      ) : isError ? (
        <div className="flex h-full items-center justify-center py-8">
          <div className="max-w-md rounded-2xl border p-5 text-center border-amber-700/40 bg-amber-950/20">
            <div className="mx-auto mb-3 inline-flex h-10 w-10 items-center justify-center rounded-full bg-amber-900/40 text-amber-300">
              <TriangleAlert size={18} />
            </div>
            <p className="text-sm font-semibold text-neutral-100">
              {t("medias.interactive.errorTitle")}
            </p>
            <p className="mt-1 text-sm text-neutral-400">
              {errorMessage ?? t("medias.interactive.errorDescription")}
            </p>
            <Button type="button" onClick={onRefetch} className="mt-4 gap-2">
              <RefreshCw size={14} />
              {t("medias.interactive.retry")}
            </Button>
          </div>
        </div>
      ) : releases.length === 0 ? (
        <div className="flex h-full items-center justify-center py-8">
          <div className="max-w-md text-center">
            <p className="text-sm font-medium text-neutral-200">
              {totalReleases > 0
                ? t("medias.interactive.noMatches")
                : t("medias.interactive.empty")}
            </p>
            {totalReleases > 0 && (
              <button
                type="button"
                onClick={onResetView}
                className="mt-3 text-sm font-medium transition-colors text-primary-400 hover:text-primary-200"
              >
                {t("medias.interactive.resetView")}
              </button>
            )}
          </div>
        </div>
      ) : (
        <div>
          {leadWithFallback && languageFallbackSummary && (
            <div
              role="status"
              className="mb-4 flex gap-3 rounded-2xl border border-violet-700/40 bg-violet-950/20 p-3"
            >
              <Languages className="mt-0.5 h-4 w-4 shrink-0 text-violet-300" />
              <div className="min-w-0 text-sm">
                <p className="font-semibold text-neutral-100">
                  {t("medias.interactive.languageFallback.bannerTitle", {
                    languages: joinLanguages(
                      t,
                      languageFallbackSummary.missing,
                    ),
                  })}
                </p>
                <p className="mt-1 text-neutral-400">
                  {t(
                    `medias.interactive.languageFallback.bannerBody${familyKey}`,
                    {
                      count: groups.fallback.length,
                      breakdown,
                      languages: joinLanguages(
                        t,
                        languageFallbackSummary.missing,
                      ),
                    },
                  )}
                </p>
              </div>
            </div>
          )}
          {leadWithFallback && fallbackGroup}
          {bestMatch && (
            <div className="mb-3">{renderCard(bestMatch, "best")}</div>
          )}
          <div className="space-y-2">{mainRows.map((r) => renderCard(r))}</div>
          {!leadWithFallback && fallbackGroup}
        </div>
      )}
    </div>
  );
}
