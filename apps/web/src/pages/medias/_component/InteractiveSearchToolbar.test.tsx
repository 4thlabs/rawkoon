import { afterEach, describe, expect, it, vi, type Mock } from "vitest";
import { fireEvent, render, screen, within } from "@testing-library/react";
import { InteractiveSearchToolbar } from "./InteractiveSearchToolbar";
import type { FilterState } from "@/features/medias/hooks/useInteractiveSearchState";

const base: FilterState = {
  filterQuery: "",
  searchApiQuery: "Film",
  hideRejected: true,
  sortBy: "quality",
  sortDir: "desc",
  includedTrackers: [],
  excludedTrackers: [],
  includedLanguages: [],
  selectedSeason: null,
  showPacksOnly: false,
};

function props(over: Partial<FilterState> = {}) {
  const state = { ...base, ...over };
  const setFilters = vi.fn();
  return {
    setFilters,
    ui: (
      <InteractiveSearchToolbar
        {...state}
        setFilters={setFilters}
        isShow
        availableSeasons={[1, 2]}
        trackerOptions={[
          { key: "a", label: "Tracker A" },
          { key: "b", label: "Tracker B" },
        ]}
        languageOptions={[{ key: "fr", label: "French" }]}
        visibleCount={26}
        totalReleases={220}
        isFetching={false}
        needsSearchQuery={false}
        searchInputRef={{ current: null }}
        onRefetch={vi.fn()}
        onResetFilters={vi.fn()}
        onIncludedTrackersChange={vi.fn()}
        onExcludedTrackersChange={vi.fn()}
      />
    ),
  };
}

const applied = (setFilters: Mock, state: FilterState = base) =>
  setFilters.mock.calls[setFilters.mock.calls.length - 1]?.[0](
    state,
  ) as FilterState;

const setDesktop = (matches: boolean) =>
  (window.matchMedia as Mock).mockImplementation((query: string) => ({
    matches,
    media: query,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  }));

describe("InteractiveSearchToolbar", () => {
  afterEach(() => setDesktop(false));

  it("counts every active filter on the Filters button and lists each as a chip", () => {
    const { ui } = props({
      hideRejected: false,
      showPacksOnly: true,
      includedTrackers: ["a"],
      excludedTrackers: ["b"],
      includedLanguages: ["fr"],
    });
    render(ui);
    expect(
      screen.getByRole("button", { name: /filters.button/ }).textContent,
    ).toContain("5");
    const chips = within(screen.getByRole("list", { name: "filters.active" }));
    expect(chips.getAllByRole("button")).toHaveLength(6); // five chips and Clear all
  });

  it("removes a chip by flipping just that filter", () => {
    const { ui, setFilters } = props({ showPacksOnly: true });
    render(ui);
    fireEvent.click(screen.getByRole("button", { name: /filters.remove/ }));
    expect(
      applied(setFilters, { ...base, showPacksOnly: true }).showPacksOnly,
    ).toBe(false);
  });

  it("opens the panel with Show, Trackers and Audio languages groups, Sort first on a phone", () => {
    const { ui, setFilters } = props();
    render(ui);
    fireEvent.click(screen.getByRole("button", { name: /filters.button/ }));
    const groups = screen
      .getAllByRole("group")
      .filter((g) => g.tagName === "SECTION")
      .map((g) => g.getAttribute("aria-label"));
    expect(groups).toEqual([
      "medias.interactive.sortLabel",
      "medias.interactive.showGroup",
      "medias.interactive.trackers",
      "medias.interactive.audioLanguages",
    ]);
    expect(
      screen.getByText(
        "medias.interactive.resultsVisible visible:26 total:220",
      ),
    ).toBeTruthy();

    fireEvent.click(
      screen.getByRole("switch", {
        name: "medias.interactive.seasonPacksOnly",
      }),
    );
    expect(applied(setFilters).showPacksOnly).toBe(true);
  });

  it("keeps Sort in its own button on desktop, out of the filter panel", () => {
    setDesktop(true);
    const { ui, setFilters } = props();
    render(ui);
    fireEvent.click(screen.getByRole("button", { name: /filters.button/ }));
    expect(
      screen.getAllByRole("group").map((g) => g.getAttribute("aria-label")),
    ).not.toContain("medias.interactive.sortLabel");
    fireEvent.keyDown(document.activeElement ?? document.body, {
      key: "Escape",
    });

    fireEvent.click(
      screen.getByRole("button", {
        name: /medias.interactive.sortOptions.quality/,
      }),
    );
    fireEvent.click(
      screen.getByRole("radio", { name: "medias.interactive.sortOptions.age" }),
    );
    expect(applied(setFilters).sortBy).toBe("age");
    fireEvent.click(
      screen.getByRole("radio", { name: "medias.sortDirectionAsc" }),
    );
    expect(applied(setFilters).sortDir).toBe("asc");
  });

  it("offers season pills only for a show and toggles a season", () => {
    const { ui, setFilters } = props();
    render(ui);
    fireEvent.click(screen.getByRole("button", { name: "S02" }));
    expect(applied(setFilters).selectedSeason).toBe(2);
  });
});
