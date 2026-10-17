import { useCallback } from "react";
import { useUrlState } from "@/lib/app/useUrlState";
import type {
  FilterType,
  FilterStatus,
  SortKey,
  SortDir,
  ViewMode,
} from "@/utils/libraryUtils";

export const LIBRARY_DEFAULTS = {
  type: "all" as FilterType,
  status: "all" as FilterStatus,
  language: "all" as string,
  search: "" as string,
  sortBy: "added_at" as SortKey,
  sortDir: "desc" as SortDir,
  view: "grid" as ViewMode,
};

export const isNonDefaultSort = (sortBy: SortKey, sortDir: SortDir) =>
  sortBy !== LIBRARY_DEFAULTS.sortBy || sortDir !== LIBRARY_DEFAULTS.sortDir;

export type LibraryPageSearchParams = Partial<typeof LIBRARY_DEFAULTS>;

export function useLibraryPageState(searchParams: LibraryPageSearchParams) {
  const { state, setState } = useUrlState(
    "/library/",
    searchParams,
    LIBRARY_DEFAULTS,
  );

  const activeFilterCount = [
    state.type !== "all",
    state.status !== "all",
    state.language !== "all",
    isNonDefaultSort(state.sortBy, state.sortDir),
  ].filter(Boolean).length;

  // One navigation each: two setState calls in a row would overwrite each other.
  const setSort = useCallback(
    (sortBy: SortKey, sortDir: SortDir) => setState({ sortBy, sortDir }),
    [setState],
  );
  const resetFilters = useCallback(
    () =>
      setState({
        type: LIBRARY_DEFAULTS.type,
        status: LIBRARY_DEFAULTS.status,
        language: LIBRARY_DEFAULTS.language,
        sortBy: LIBRARY_DEFAULTS.sortBy,
        sortDir: LIBRARY_DEFAULTS.sortDir,
      }),
    [setState],
  );

  return { state, setState, setSort, resetFilters, activeFilterCount };
}
