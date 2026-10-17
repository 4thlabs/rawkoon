import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { LibraryToolbar } from "./LibraryToolbar";

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string, params?: Record<string, unknown>) =>
      params ? `${key}:${JSON.stringify(params)}` : key,
  }),
}));

beforeEach(() => {
  vi.stubGlobal(
    "matchMedia",
    vi.fn().mockImplementation(() => ({
      matches: true,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    })),
  );
});

const handlers = () => ({
  onSearchChange: vi.fn(),
  onTypeChange: vi.fn(),
  onStatusChange: vi.fn(),
  onLanguageChange: vi.fn(),
  onSortChange: vi.fn(),
  onViewModeChange: vi.fn(),
  onReset: vi.fn(),
});

const base = {
  search: "",
  typeFilter: "all" as const,
  statusFilter: "all" as const,
  languageFilter: "all",
  sortBy: "added_at" as const,
  sortDir: "desc" as const,
  viewMode: "grid" as const,
  languageTags: [],
  movieCount: 8,
  showCount: 3,
  resultCount: 11,
  activeFilterCount: 0,
};

describe("LibraryToolbar", () => {
  it("shows search, Filters and the three-way view toggle, with no chips by default", () => {
    render(<LibraryToolbar {...base} {...handlers()} />);
    expect(screen.getByRole("searchbox")).toBeInTheDocument();
    expect(
      screen.getAllByRole("radio", { name: /filters\.view\./ }),
    ).toHaveLength(3);
    expect(screen.queryByLabelText("filters.active")).toBeNull();
  });

  it("offers Gave up (skipped) in the panel and reports the choice", () => {
    const h = handlers();
    render(<LibraryToolbar {...base} {...h} />);
    fireEvent.click(screen.getByRole("button", { name: /filters\.button/ }));
    fireEvent.click(
      screen.getByRole("radio", { name: "medias.library.statusSkipped" }),
    );
    expect(h.onStatusChange).toHaveBeenCalledWith("skipped");
  });

  it("shows removable chips for filters and a non-default sort", () => {
    const h = handlers();
    render(
      <LibraryToolbar
        {...base}
        {...h}
        typeFilter="show"
        statusFilter="skipped"
        sortBy="title"
        sortDir="asc"
        activeFilterCount={3}
      />,
    );
    const chips = screen.getByLabelText("filters.active");
    expect(chips).toHaveTextContent("medias.library.typeShows");
    expect(chips).toHaveTextContent("medias.library.statusSkipped");
    expect(chips).toHaveTextContent("medias.library.sortChip");

    fireEvent.click(screen.getByRole("button", { name: /typeShows/ }));
    expect(h.onTypeChange).toHaveBeenCalledWith("all");

    fireEvent.click(screen.getByRole("button", { name: /sortChip/ }));
    expect(h.onSortChange).toHaveBeenCalledWith("added_at", "desc");

    fireEvent.click(screen.getByRole("button", { name: "filters.clearAll" }));
    expect(h.onReset).toHaveBeenCalledOnce();
  });

  it("hides the language group until tags exist", () => {
    render(<LibraryToolbar {...base} {...handlers()} />);
    fireEvent.click(screen.getByRole("button", { name: /filters\.button/ }));
    expect(
      screen.queryByRole("group", { name: "medias.library.languageSection" }),
    ).toBeNull();
  });
});
