import { useTranslation } from "react-i18next";
import {
  ActiveFilterChips,
  FilterButton,
  FilterChoices,
  FilterGroup,
  FilterPanel,
  FilterSegmented,
  ToolbarSearch,
  type ActiveFilterChip,
  type FilterOption,
} from "@/components/ui/filter-panel";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ViewToggle } from "@/components/ui/view-toggle";
import {
  type FilterType,
  type FilterStatus,
  type SortKey,
  type SortDir,
  type ViewMode,
  LIBRARY_SORT_KEYS,
  VIEW_MODES,
} from "@/utils/libraryUtils";
import { LIBRARY_DEFAULTS, isNonDefaultSort } from "./useLibraryPageState";

/** Which direction reads first in the panel; the other follows. */
const FIRST_DIR: Record<SortKey, SortDir> = {
  added_at: "desc",
  last_grabbed_at: "desc",
  title: "asc",
  year: "desc",
  status: "asc",
  digital_release_date: "desc",
  file_size: "desc",
};

interface LibraryToolbarProps {
  search: string;
  typeFilter: FilterType;
  statusFilter: FilterStatus;
  languageFilter: string;
  sortBy: SortKey;
  sortDir: SortDir;
  viewMode: ViewMode;
  languageTags: string[];
  movieCount: number;
  showCount: number;
  resultCount: number | null;
  activeFilterCount: number;
  onSearchChange: (value: string) => void;
  onTypeChange: (value: FilterType) => void;
  onStatusChange: (value: FilterStatus) => void;
  onLanguageChange: (value: string) => void;
  onSortByChange: (value: SortKey) => void;
  onSortDirChange: (value: SortDir) => void;
  onViewModeChange: (value: ViewMode) => void;
  onReset: () => void;
}

export function LibraryToolbar({
  search,
  typeFilter,
  statusFilter,
  languageFilter,
  sortBy,
  sortDir,
  viewMode,
  languageTags,
  movieCount,
  showCount,
  resultCount,
  activeFilterCount,
  onSearchChange,
  onTypeChange,
  onStatusChange,
  onLanguageChange,
  onSortByChange,
  onSortDirChange,
  onViewModeChange,
  onReset,
}: LibraryToolbarProps) {
  const { t } = useTranslation("common");

  const typeOptions: FilterOption<FilterType>[] = [
    { id: "all", label: t("medias.library.typeAll") },
    { id: "movie", label: t("medias.library.typeMovies"), count: movieCount },
    { id: "show", label: t("medias.library.typeShows"), count: showCount },
  ];
  const statusOptions: FilterOption<FilterStatus>[] = [
    { id: "all", label: t("medias.library.statusAll") },
    { id: "downloaded", label: t("medias.library.statusDownloaded") },
    { id: "wanted", label: t("medias.library.statusWanted") },
    { id: "downloading", label: t("medias.library.statusDownloading") },
    { id: "skipped", label: t("medias.library.statusSkipped") },
  ];
  const first = FIRST_DIR[sortBy];
  const second: SortDir = first === "asc" ? "desc" : "asc";
  const dirOptions: FilterOption<SortDir>[] = [first, second].map((dir) => ({
    id: dir as SortDir,
    label: t(`medias.library.sortDir.${sortBy}.${dir}`),
  }));

  const chips: ActiveFilterChip[] = [];
  if (typeFilter !== "all")
    chips.push({
      id: "type",
      label: typeOptions.find((o) => o.id === typeFilter)?.label ?? typeFilter,
      onRemove: () => onTypeChange("all"),
    });
  if (statusFilter !== "all")
    chips.push({
      id: "status",
      label:
        statusOptions.find((o) => o.id === statusFilter)?.label ?? statusFilter,
      onRemove: () => onStatusChange("all"),
    });
  if (languageFilter !== "all")
    chips.push({
      id: "language",
      label: languageFilter,
      onRemove: () => onLanguageChange("all"),
    });
  if (isNonDefaultSort(sortBy, sortDir))
    chips.push({
      id: "sort",
      label: t("medias.library.sortChip", {
        sort: t(`medias.library.sort.${sortBy}`),
        direction: t(`medias.library.sortDir.${sortBy}.${sortDir}`),
      }),
      onRemove: () => {
        onSortByChange(LIBRARY_DEFAULTS.sortBy);
        onSortDirChange(LIBRARY_DEFAULTS.sortDir);
      },
    });

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <ToolbarSearch
          value={search}
          onChange={onSearchChange}
          placeholder={t("medias.library.searchPlaceholder")}
          className="w-full sm:w-auto sm:max-w-md sm:flex-1"
        />
        <FilterPanel
          trigger={<FilterButton count={activeFilterCount} />}
          title={t("filters.title")}
          resultCount={
            resultCount === null
              ? null
              : t("medias.library.resultCount", { count: resultCount })
          }
          onReset={activeFilterCount > 0 ? onReset : undefined}
        >
          <FilterGroup label={t("medias.library.typeSection")}>
            <FilterSegmented
              ariaLabel={t("medias.library.typeSection")}
              options={typeOptions}
              value={typeFilter}
              onChange={onTypeChange}
            />
          </FilterGroup>
          <FilterGroup label={t("medias.library.statusSection")}>
            <FilterChoices
              ariaLabel={t("medias.library.statusSection")}
              options={statusOptions}
              value={statusFilter}
              onChange={onStatusChange}
            />
          </FilterGroup>
          {languageTags.length > 0 && (
            <FilterGroup label={t("medias.library.languageSection")}>
              <Select value={languageFilter} onValueChange={onLanguageChange}>
                <SelectTrigger
                  aria-label={t("medias.library.languageSection")}
                  className="h-9 w-full rounded-lg border-neutral-700 bg-surface-inset px-3 text-sm"
                >
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">
                    {t("medias.library.languageAll")}
                  </SelectItem>
                  {languageTags.map((tag) => (
                    <SelectItem key={tag} value={tag}>
                      {tag}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </FilterGroup>
          )}
          <FilterGroup label={t("medias.library.sortSection")}>
            <div className="flex flex-wrap items-center gap-2">
              <Select
                value={sortBy}
                onValueChange={(v) => {
                  onSortByChange(v as SortKey);
                  onSortDirChange(FIRST_DIR[v as SortKey]);
                }}
              >
                <SelectTrigger
                  aria-label={t("medias.library.sortSection")}
                  className="h-9 min-w-0 flex-1 rounded-lg border-neutral-700 bg-surface-inset px-3 text-sm"
                >
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {LIBRARY_SORT_KEYS.map((key) => (
                    <SelectItem key={key} value={key}>
                      {t(`medias.library.sort.${key}`)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <div className="shrink-0">
                <FilterSegmented
                  ariaLabel={t("medias.library.sortDirection")}
                  options={dirOptions}
                  value={sortDir}
                  onChange={onSortDirChange}
                />
              </div>
            </div>
          </FilterGroup>
        </FilterPanel>
        <ViewToggle
          value={viewMode}
          onChange={onViewModeChange}
          modes={VIEW_MODES}
          className="ml-auto"
        />
      </div>
      <ActiveFilterChips chips={chips} onClearAll={onReset} />
    </div>
  );
}
