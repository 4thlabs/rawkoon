import type { Dispatch, RefObject, SetStateAction } from "react";
import { useTranslation } from "react-i18next";
import {
  ArrowDownWideNarrow,
  ArrowUpDown,
  ArrowUpNarrowWide,
  RefreshCw,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  INTERACTIVE_SORT_KEYS,
  type InteractiveSortDir,
  type InteractiveSortKey,
} from "@/lib/utils/interactive-search";
import {
  ActiveFilterChips,
  FilterButton,
  FilterChoices,
  FilterGroup,
  FilterPanel,
  FilterSegmented,
  ToolbarSearch,
  useIsDesktop,
  type ActiveFilterChip,
} from "@/components/ui/filter-panel";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Switch } from "@/components/ui/switch";
import type { FilterState } from "@/features/medias/hooks/useInteractiveSearchState";
import { ChipMultiSelect, type FilterOption } from "./InteractiveSearchFilters";

interface InteractiveSearchToolbarProps {
  filterQuery: string;
  hideRejected: boolean;
  sortBy: InteractiveSortKey;
  sortDir: InteractiveSortDir;
  includedTrackers: string[];
  excludedTrackers: string[];
  includedLanguages: string[];
  selectedSeason: number | "complete" | null;
  showPacksOnly: boolean;
  setFilters: Dispatch<SetStateAction<FilterState>>;
  isShow: boolean;
  availableSeasons: number[];
  trackerOptions: FilterOption[];
  languageOptions: FilterOption[];
  visibleCount: number;
  totalReleases: number;
  isFetching: boolean;
  needsSearchQuery: boolean;
  searchInputRef: RefObject<HTMLInputElement | null>;
  onRefetch: () => void;
  onResetFilters: () => void;
  onIncludedTrackersChange: (values: string[]) => void;
  onExcludedTrackersChange: (values: string[]) => void;
}

const PILL =
  "focus-ring shrink-0 rounded-full px-3.5 py-1.5 text-sm font-medium transition-colors";

function SortDirectionIcon({ dir }: { dir: InteractiveSortDir }) {
  const Icon = dir === "asc" ? ArrowUpNarrowWide : ArrowDownWideNarrow;
  return <Icon size={14} aria-hidden />;
}

function ToggleRow({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <label className="flex min-h-10 cursor-pointer items-center justify-between gap-3 text-sm text-neutral-200">
      {label}
      <Switch checked={checked} aria-label={label} onCheckedChange={onChange} />
    </label>
  );
}

export function InteractiveSearchToolbar({
  filterQuery,
  hideRejected,
  sortBy,
  sortDir,
  includedTrackers,
  excludedTrackers,
  includedLanguages,
  selectedSeason,
  showPacksOnly,
  setFilters,
  isShow,
  availableSeasons,
  trackerOptions,
  languageOptions,
  visibleCount,
  totalReleases,
  isFetching,
  needsSearchQuery,
  searchInputRef,
  onRefetch,
  onResetFilters,
  onIncludedTrackersChange,
  onExcludedTrackersChange,
}: InteractiveSearchToolbarProps) {
  const { t } = useTranslation("common");
  const isDesktop = useIsDesktop();

  const patch = (next: Partial<FilterState>) =>
    setFilters((prev) => ({ ...prev, ...next }));

  const labelOf = (options: FilterOption[], key: string) =>
    options.find((o) => o.key === key)?.label ?? key;

  const chips: ActiveFilterChip[] = [
    ...(hideRejected
      ? []
      : [
          {
            id: "rejected",
            label: t("medias.interactive.showingRejected"),
            onRemove: () => patch({ hideRejected: true }),
          },
        ]),
    ...(showPacksOnly
      ? [
          {
            id: "packs",
            label: t("medias.interactive.packsOnly"),
            onRemove: () => patch({ showPacksOnly: false }),
          },
        ]
      : []),
    ...includedTrackers.map((key) => ({
      id: `tracker-${key}`,
      label: labelOf(trackerOptions, key),
      onRemove: () =>
        onIncludedTrackersChange(includedTrackers.filter((k) => k !== key)),
    })),
    ...excludedTrackers.map((key) => ({
      id: `no-tracker-${key}`,
      label: t("medias.interactive.excludedTracker", {
        name: labelOf(trackerOptions, key),
      }),
      onRemove: () =>
        onExcludedTrackersChange(excludedTrackers.filter((k) => k !== key)),
    })),
    ...includedLanguages.map((key) => ({
      id: `language-${key}`,
      label: labelOf(languageOptions, key),
      onRemove: () =>
        patch({
          includedLanguages: includedLanguages.filter((k) => k !== key),
        }),
    })),
  ];

  const sortKeyOptions = INTERACTIVE_SORT_KEYS.map((key) => ({
    id: key,
    label: t(`medias.interactive.sortOptions.${key}`),
  }));
  const sortDirOptions = [
    { id: "desc" as const, label: t("medias.sortDirectionDesc") },
    { id: "asc" as const, label: t("medias.sortDirectionAsc") },
  ];
  const sortControls = (
    <div className="space-y-3">
      <FilterChoices
        ariaLabel={t("medias.interactive.sortLabel")}
        options={sortKeyOptions}
        value={sortBy}
        onChange={(key) => patch({ sortBy: key })}
      />
      <FilterSegmented
        ariaLabel={t("medias.interactive.sortDirection")}
        options={sortDirOptions}
        value={sortDir}
        onChange={(dir) => patch({ sortDir: dir })}
      />
    </div>
  );

  const seasonPill = (
    active: boolean,
    tone: "primary" | "violet" = "primary",
  ) =>
    cn(
      PILL,
      active
        ? tone === "violet"
          ? "bg-violet-600 text-white"
          : "bg-primary-600 text-neutral-950"
        : "bg-neutral-800 text-neutral-300 hover:bg-neutral-700",
    );

  return (
    <div className="sticky top-0 z-10 space-y-3 border-b border-neutral-800 bg-neutral-900/95 pb-3 pt-2 backdrop-blur-sm">
      {isShow && availableSeasons.length > 0 && (
        <div
          role="group"
          aria-label={t("medias.interactive.seasonSearch")}
          className="-mx-1 flex items-center gap-1.5 overflow-x-auto px-1 pb-0.5 [scrollbar-width:none]"
        >
          <button
            type="button"
            aria-pressed={selectedSeason === null}
            onClick={() => patch({ selectedSeason: null })}
            className={seasonPill(selectedSeason === null)}
          >
            {t("medias.interactive.seasonAll")}
          </button>
          {availableSeasons.map((s) => (
            <button
              key={s}
              type="button"
              aria-pressed={selectedSeason === s}
              onClick={() =>
                patch({ selectedSeason: selectedSeason === s ? null : s })
              }
              className={cn(seasonPill(selectedSeason === s), "font-mono")}
            >
              S{String(s).padStart(2, "0")}
            </button>
          ))}
          <button
            type="button"
            aria-pressed={selectedSeason === "complete"}
            onClick={() =>
              patch({
                selectedSeason:
                  selectedSeason === "complete" ? null : "complete",
              })
            }
            className={seasonPill(selectedSeason === "complete", "violet")}
          >
            {t("medias.interactive.completeSeries")}
          </button>
        </div>
      )}

      <div className="flex flex-wrap items-center gap-2">
        <ToolbarSearch
          inputRef={searchInputRef}
          value={filterQuery}
          onChange={(value) => patch({ filterQuery: value })}
          placeholder={t("medias.interactive.filterPlaceholder")}
          className="w-full sm:w-auto sm:max-w-md sm:flex-1"
        />

        <FilterPanel
          trigger={<FilterButton count={chips.length} />}
          title={t("filters.title")}
          resultCount={t("medias.interactive.resultsVisible", {
            visible: visibleCount,
            total: totalReleases,
          })}
          onReset={chips.length > 0 ? onResetFilters : undefined}
        >
          {!isDesktop && (
            <FilterGroup label={t("medias.interactive.sortLabel")}>
              {sortControls}
            </FilterGroup>
          )}
          <FilterGroup label={t("medias.interactive.showGroup")}>
            <ToggleRow
              label={t("medias.interactive.hideRejected")}
              checked={hideRejected}
              onChange={(value) => patch({ hideRejected: value })}
            />
            <ToggleRow
              label={t("medias.interactive.seasonPacksOnly")}
              checked={showPacksOnly}
              onChange={(value) => patch({ showPacksOnly: value })}
            />
          </FilterGroup>
          <FilterGroup label={t("medias.interactive.trackers")}>
            <div className="space-y-3">
              <div className="space-y-1.5">
                <p className="text-xs text-neutral-400">
                  {t("medias.interactive.trackersInclude")}
                </p>
                <ChipMultiSelect
                  ariaLabel={t("medias.interactive.trackersInclude")}
                  options={trackerOptions}
                  selected={includedTrackers}
                  onChange={onIncludedTrackersChange}
                  emptyText={t("medias.interactive.noTrackers")}
                />
              </div>
              {trackerOptions.length > 0 && (
                <div className="space-y-1.5">
                  <p className="text-xs text-neutral-400">
                    {t("medias.interactive.trackersExclude")}
                  </p>
                  <ChipMultiSelect
                    ariaLabel={t("medias.interactive.trackersExclude")}
                    options={trackerOptions}
                    selected={excludedTrackers}
                    onChange={onExcludedTrackersChange}
                    emptyText={t("medias.interactive.noTrackers")}
                  />
                </div>
              )}
            </div>
          </FilterGroup>
          <FilterGroup label={t("medias.interactive.audioLanguages")}>
            <ChipMultiSelect
              ariaLabel={t("medias.interactive.audioLanguages")}
              options={languageOptions}
              selected={includedLanguages}
              onChange={(values) => patch({ includedLanguages: values })}
              emptyText={t("medias.interactive.noLanguages")}
            />
          </FilterGroup>
        </FilterPanel>

        {isDesktop && (
          <Popover>
            <PopoverTrigger asChild>
              <button
                type="button"
                className="focus-ring inline-flex h-10 items-center gap-2 rounded-xl border border-neutral-700 bg-neutral-900 px-3.5 text-sm font-medium text-neutral-300 transition-colors hover:border-neutral-600 hover:text-neutral-100"
              >
                <ArrowUpDown size={14} aria-hidden />
                {t(`medias.interactive.sortOptions.${sortBy}`)}
                <SortDirectionIcon dir={sortDir} />
                <span className="sr-only">
                  {t("medias.interactive.sortLabel")}
                </span>
              </button>
            </PopoverTrigger>
            <PopoverContent
              align="end"
              sideOffset={8}
              aria-label={t("medias.interactive.sortLabel")}
              className="w-[min(22rem,calc(100vw-2rem))] border-neutral-700 bg-surface-raised"
            >
              {sortControls}
            </PopoverContent>
          </Popover>
        )}

        <button
          type="button"
          onClick={onRefetch}
          disabled={isFetching || needsSearchQuery}
          aria-label={t("medias.interactive.refresh")}
          title={t("medias.interactive.refresh")}
          className="focus-ring ml-auto inline-flex size-10 items-center justify-center rounded-xl border border-neutral-700 bg-neutral-900 text-neutral-300 transition-colors hover:border-neutral-600 hover:text-neutral-100 disabled:opacity-50 sm:ml-0"
        >
          <RefreshCw size={14} className={isFetching ? "animate-spin" : ""} />
        </button>
      </div>

      <ActiveFilterChips chips={chips} onClearAll={onResetFilters} />
    </div>
  );
}
