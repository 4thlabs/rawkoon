import { useRef } from "react";
import { useSearch } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { useDiscoverMedias } from "@/features/medias/hooks/useDiscoverMedias";
import { useMediaGenres } from "@/features/medias/hooks/useMediaGenres";
import { useStreamingProviders } from "@/features/medias/hooks/useStreamingProviders";
import {
  DISCOVER_PAGE_SIZE,
  DISCOVER_SORTS,
} from "@/pages/medias/_component/discover/discoverConfig";
import {
  buildDiscoverFilterSignature,
  buildDiscoverGridKey,
} from "@/pages/medias/_component/discover/discoverSignatures";
import { useDiscoverScrollToAnchor } from "@/pages/medias/_component/useDiscoverScrollToAnchor";
import { useDiscoverPageState } from "@/pages/medias/_component/useDiscoverPageState";
import { DiscoverPagination } from "@/pages/medias/_component/discover/DiscoverPagination";
import { DiscoverResultsGrid } from "@/pages/medias/_component/discover/DiscoverResultsGrid";
import { DiscoverToolbar } from "@/pages/medias/_component/discover/DiscoverToolbar";

export function DiscoverPanel() {
  const { t, i18n } = useTranslation("common");
  const lang = i18n.language;

  const search = useSearch({ from: "/find/" });
  const { state, setState } = useDiscoverPageState(search);

  const mediaType = state.type;
  const providerId = state.provider;
  const genreId = state.genre;
  const sortBy = state.sort;
  const page = state.page;
  const originalLanguage = state.lang;
  const hideOwned = state.hide_owned;

  const topRef = useRef<HTMLDivElement>(null);

  const filterSignature = buildDiscoverFilterSignature({
    lang,
    mediaType,
    providerId,
    genreId,
    sortBy,
    originalLanguage,
  });
  useDiscoverScrollToAnchor(topRef, filterSignature, page);

  const { data: providersData } = useStreamingProviders(mediaType, lang);
  const { data: genresData } = useMediaGenres(mediaType, lang);

  const { data, isFetching, isPlaceholderData } = useDiscoverMedias({
    type: mediaType,
    provider_id: providerId,
    genre_id: genreId,
    sort_by: sortBy,
    page,
    language: lang,
    original_language: originalLanguage,
  });

  const visibleSorts = DISCOVER_SORTS.filter((s) => {
    if (mediaType === "tv" && s.movieOnly) return false;
    if (mediaType === "movie" && s.tvOnly) return false;
    return true;
  });

  const providers = providersData?.providers ?? [];
  const genres = genresData?.genres ?? [];
  const region = data?.region ?? providersData?.region ?? null;

  const activeProvider = providers.find((p) => p.id === providerId) ?? null;
  const activeGenre = genres.find((g) => g.id === genreId) ?? null;
  const activeSort = visibleSorts.find((s) => s.value === sortBy) ?? null;

  function switchType(type: "movie" | "tv") {
    let nextSort = sortBy;
    if (
      type === "tv" &&
      (nextSort === "revenue.desc" || nextSort === "primary_release_date.desc")
    )
      nextSort = "popularity.desc";
    if (type === "movie" && nextSort === "first_air_date.desc")
      nextSort = "popularity.desc";
    setState({ type, genre: null, sort: nextSort, page: 1 });
  }

  function setProvider(id: number | null) {
    setState({ provider: id, page: 1 });
  }
  function setGenre(id: number | null) {
    setState({ genre: id, page: 1 });
  }
  function changeSort(value: string) {
    setState({ sort: value, page: 1 });
  }
  function toggleLanguage(code: string) {
    setState({ lang: originalLanguage === code ? null : code, page: 1 });
  }

  const totalPages = data?.total_pages ?? 1;
  const totalResults = data?.total_results;
  const gridKey = buildDiscoverGridKey({
    mediaType,
    providerId,
    genreId,
    sortBy,
    page,
    originalLanguage,
    dataPage: data?.page,
  });
  const showSkeletonGrid = !data && isFetching;
  // Filters the page in view: the API has no "not in library" parameter.
  const items = hideOwned
    ? data?.items.filter((item) => !item.already_exists)
    : data?.items;
  const hasItems = (items?.length ?? 0) > 0;

  return (
    <section className="relative space-y-5">
      <div ref={topRef} />

      <div className="flex items-baseline gap-2.5 px-0.5">
        <h2 className="text-base font-semibold text-neutral-100">
          {t("medias.discover.title")}
        </h2>
        {region && (
          <span className="text-xs text-neutral-400">
            {t("medias.discover.regionHint", { region })}
          </span>
        )}
        {totalResults != null && data != null && (
          <span className="text-xs tabular-nums text-neutral-400">
            {totalResults.toLocaleString()} {t("medias.discover.titles")}
          </span>
        )}
      </div>

      <div className="min-w-0 space-y-5">
        <DiscoverToolbar
          mediaType={mediaType}
          providerId={providerId}
          genreId={genreId}
          sortBy={sortBy}
          originalLanguage={originalLanguage}
          providers={providers}
          genres={genres}
          visibleSorts={visibleSorts}
          activeProvider={activeProvider}
          activeGenre={activeGenre}
          activeSort={activeSort}
          onMediaTypeChange={switchType}
          onProviderChange={setProvider}
          onGenreChange={setGenre}
          onSortChange={changeSort}
          onLanguageToggle={toggleLanguage}
        />
        <button
          type="button"
          aria-pressed={hideOwned}
          onClick={() => setState({ hide_owned: !hideOwned })}
          className={`focus-ring rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${
            hideOwned
              ? "border-primary-500/50 bg-primary-500/10 text-primary-200"
              : "border-neutral-700 bg-neutral-900 text-neutral-300 hover:border-neutral-600"
          }`}
        >
          {t("find.hideOwned")}
        </button>
      </div>

      <DiscoverResultsGrid
        discoverPageSize={DISCOVER_PAGE_SIZE}
        showSkeletonGrid={showSkeletonGrid}
        hasItems={hasItems}
        gridKey={gridKey}
        isPlaceholderData={isPlaceholderData}
        items={items}
        noResultsLabel={t("medias.discover.noResults")}
      />

      <DiscoverPagination
        page={page}
        totalPages={totalPages}
        isFetching={isFetching}
        onPageChange={(next) => setState({ page: next })}
      />
    </section>
  );
}
