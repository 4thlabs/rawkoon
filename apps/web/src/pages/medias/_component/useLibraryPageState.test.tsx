import { describe, it, expect, vi, beforeEach } from "vitest";
import { useState } from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { LibraryToolbar } from "./LibraryToolbar";
import {
  useLibraryPageState,
  type LibraryPageSearchParams,
} from "./useLibraryPageState";

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string, params?: Record<string, unknown>) =>
      params ? `${key}:${JSON.stringify(params)}` : key,
  }),
}));

// A tiny router: navigate() replaces the search params the hook is given.
let setSearchParams: (s: LibraryPageSearchParams) => void;
vi.mock("@tanstack/react-router", () => ({
  useNavigate: () => (opts: { search: LibraryPageSearchParams }) =>
    setSearchParams(opts.search),
}));

function Harness({ initial }: { initial: LibraryPageSearchParams }) {
  const [params, setParams] = useState(initial);
  setSearchParams = setParams;
  const { state, setState, setSort, resetFilters, activeFilterCount } =
    useLibraryPageState(params);
  return (
    <>
      <output data-testid="url">{JSON.stringify(params)}</output>
      <LibraryToolbar
        search={state.search}
        typeFilter={state.type}
        statusFilter={state.status}
        languageFilter={state.language}
        sortBy={state.sortBy}
        sortDir={state.sortDir}
        viewMode={state.view}
        languageTags={[]}
        movieCount={1}
        showCount={1}
        resultCount={2}
        activeFilterCount={activeFilterCount}
        onSearchChange={(search) => setState({ search })}
        onTypeChange={(type) => setState({ type })}
        onStatusChange={(status) => setState({ status })}
        onLanguageChange={(language) => setState({ language })}
        onSortChange={setSort}
        onViewModeChange={(view) => setState({ view })}
        onReset={resetFilters}
      />
    </>
  );
}

const url = () => JSON.parse(screen.getByTestId("url").textContent ?? "{}");

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

describe("library sort and reset in the URL", () => {
  it("changes direction without losing the key", () => {
    render(<Harness initial={{}} />);
    fireEvent.click(screen.getByRole("button", { name: /filters\.button/ }));
    fireEvent.click(
      screen.getByRole("radio", { name: /sortDir\.added_at\.asc/ }),
    );
    expect(url()).toEqual({ sortDir: "asc" });
  });

  it("removing the sort chip restores both defaults", () => {
    render(<Harness initial={{ sortBy: "title", sortDir: "asc" }} />);
    fireEvent.click(screen.getByRole("button", { name: /sortChip/ }));
    expect(url()).toEqual({});
  });

  it("Clear all drops filters and sort together", () => {
    render(
      <Harness
        initial={{
          type: "show",
          status: "skipped",
          sortBy: "file_size",
          sortDir: "asc",
        }}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: "filters.clearAll" }));
    expect(url()).toEqual({});
  });

  it("keeps other filters when only the sort changes", () => {
    render(
      <Harness initial={{ type: "show", sortBy: "title", sortDir: "asc" }} />,
    );
    fireEvent.click(screen.getByRole("button", { name: /filters\.button/ }));
    fireEvent.click(
      screen.getByRole("radio", { name: /sortDir\.title\.desc/ }),
    );
    expect(url()).toEqual({ type: "show", sortBy: "title" });
  });
});
