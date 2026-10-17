import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { DiscoverPanel } from "@/pages/medias/_component/DiscoverPanel";

const setState = vi.fn();
let state = { hide_owned: true, page: 1 };
let items: { id: string; already_exists: boolean }[] = [];
let totalPages = 3;

vi.mock("@tanstack/react-router", () => ({ useSearch: () => ({}) }));
vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (k: string, o?: { count?: number }) =>
      o?.count != null ? `${k}:${o.count}` : k,
    i18n: { language: "en" },
  }),
}));
vi.mock("@/pages/medias/_component/useDiscoverPageState", () => ({
  useDiscoverPageState: () => ({
    state: {
      type: "movie",
      provider: null,
      genre: null,
      sort: "popularity.desc",
      lang: null,
      ...state,
    },
    setState,
  }),
}));
vi.mock("@/features/medias/hooks/useDiscoverMedias", () => ({
  useDiscoverMedias: () => ({
    data: {
      items,
      total_pages: totalPages,
      total_results: 60,
      page: 1,
      region: "CA",
    },
    isFetching: false,
    isPlaceholderData: false,
  }),
}));
vi.mock("@/features/medias/hooks/useMediaGenres", () => ({
  useMediaGenres: () => ({ data: { genres: [] } }),
}));
vi.mock("@/features/medias/hooks/useStreamingProviders", () => ({
  useStreamingProviders: () => ({ data: { providers: [] } }),
}));
vi.mock("@/pages/medias/_component/useDiscoverScrollToAnchor", () => ({
  useDiscoverScrollToAnchor: () => {},
}));
vi.mock("@/pages/medias/_component/discover/DiscoverToolbar", () => ({
  DiscoverToolbar: () => <div />,
}));
vi.mock("@/pages/medias/_component/discover/DiscoverPagination", () => ({
  DiscoverPagination: () => <div />,
}));
vi.mock("@/pages/medias/_component/discover/DiscoverResultsGrid", () => ({
  DiscoverResultsGrid: ({
    items: shown,
    noResultsLabel,
  }: {
    items: { id: string }[] | undefined;
    noResultsLabel: string;
  }) => (
    <div>
      {shown?.length
        ? shown.map((i) => <span key={i.id}>{i.id}</span>)
        : noResultsLabel}
    </div>
  ),
}));

describe("DiscoverPanel hide what I own", () => {
  beforeEach(() => {
    setState.mockReset();
    state = { hide_owned: true, page: 1 };
    totalPages = 3;
  });

  it("says how many owned titles are hidden on the page", () => {
    items = [
      { id: "a", already_exists: true },
      { id: "b", already_exists: false },
    ];
    render(<DiscoverPanel />);
    expect(screen.getByText("find.hiddenOnPage:1")).toBeTruthy();
    expect(screen.queryByText("a")).toBeNull();
    expect(screen.getByText("b")).toBeTruthy();
    expect(screen.getByText(/find.countInList/)).toBeTruthy();
  });

  it("explains an all-owned page and offers the next page", () => {
    items = [{ id: "a", already_exists: true }];
    render(<DiscoverPanel />);
    expect(screen.getByText("find.allOwnedOnPage")).toBeTruthy();
    fireEvent.click(screen.getByText("find.nextPage"));
    expect(setState).toHaveBeenCalledWith({ page: 2 });
  });

  it("offers no next page on the last page", () => {
    items = [{ id: "a", already_exists: true }];
    totalPages = 1;
    render(<DiscoverPanel />);
    expect(screen.queryByText("find.nextPage")).toBeNull();
  });

  it("shows everything and no hint when the filter is off", () => {
    state = { hide_owned: false, page: 1 };
    items = [{ id: "a", already_exists: true }];
    render(<DiscoverPanel />);
    expect(screen.getByText("a")).toBeTruthy();
    expect(screen.queryByText(/find.hiddenOnPage/)).toBeNull();
  });
});
