import { describe, it, expect, vi, beforeEach } from "vitest";
import { screen } from "@testing-library/react";
import { renderWithProviders } from "@/test-utils/render";
import type { LibraryGrowth } from "@rawkoon/shared/types";
import { LibraryGrowthWidget } from "./LibraryGrowthWidget";

const mockUseFeatures = vi.fn();
const mockUseAuth = vi.fn();
const mockUseLibraryGrowth = vi.fn();

vi.mock("@/lib/routing/useFeatures", () => ({
  useFeatures: () => mockUseFeatures(),
}));
vi.mock("@/lib/auth/useAuth", () => ({ useAuth: () => mockUseAuth() }));
vi.mock("./useLibraryGrowth", () => ({
  useLibraryGrowth: () => mockUseLibraryGrowth(),
}));
vi.mock("@tanstack/react-router", () => ({
  useNavigate: () => vi.fn(),
}));

const bucket = (start: string, over = {}) => ({
  start,
  movies: 0,
  episodes: 0,
  books: 0,
  upgrades: 0,
  bytes: 0,
  ...over,
});

const growth = (bytes: number | null): LibraryGrowth => ({
  timezone: "America/Toronto",
  month: bucket("2026-10-01", {
    movies: 1,
    episodes: 32,
    books: 2,
    upgrades: 3,
    bytes,
  }),
  previous_to_date: bucket("2026-09-01", {
    movies: 3,
    episodes: 7,
    bytes: bytes === null ? null : 2 * 1024 ** 3,
  }),
  previous_month: bucket("2026-09-01"),
  weeks: Array.from({ length: 12 }, (_, i) =>
    bucket(`2026-08-${String(10 + i).padStart(2, "0")}`, { episodes: i }),
  ),
  since: "2026-04-07",
});

describe("LibraryGrowthWidget", () => {
  beforeEach(() => {
    mockUseFeatures.mockReturnValue({ data: { books_enabled: true } });
    mockUseAuth.mockReturnValue({ user: { is_admin: true } });
    mockUseLibraryGrowth.mockReturnValue({
      data: { growth: growth(4 * 1024 ** 3) },
      isError: false,
    });
  });

  it("shows bytes and a percent comparison for admins", () => {
    renderWithProviders(<LibraryGrowthWidget />);
    expect(screen.getByText("4.29 GB")).toBeInTheDocument();
    expect(
      screen.getByText(/libraryGrowth\.vsPrevious.*percent:100/),
    ).toBeInTheDocument();
    expect(screen.getByText("libraryGrowth.books")).toBeInTheDocument();
  });

  it("shows titles for members", () => {
    mockUseAuth.mockReturnValue({ user: { is_admin: false } });
    mockUseLibraryGrowth.mockReturnValue({
      data: { growth: growth(null) },
      isError: false,
    });
    renderWithProviders(<LibraryGrowthWidget />);
    expect(
      screen.getByText(/libraryGrowth\.titles.*count:35/),
    ).toBeInTheDocument();
  });

  it("hides books when the feature is off", () => {
    mockUseFeatures.mockReturnValue({ data: { books_enabled: false } });
    renderWithProviders(<LibraryGrowthWidget />);
    expect(screen.queryByText("libraryGrowth.books")).not.toBeInTheDocument();
  });

  it("renders nothing on error", () => {
    mockUseLibraryGrowth.mockReturnValue({ data: undefined, isError: true });
    const { container } = renderWithProviders(<LibraryGrowthWidget />);
    expect(container).toBeEmptyDOMElement();
  });

  it("renders nothing when everything is zero", () => {
    const empty: LibraryGrowth = {
      ...growth(0),
      month: bucket("2026-10-01"),
      weeks: Array.from({ length: 12 }, () => bucket("2026-08-10")),
    };
    mockUseLibraryGrowth.mockReturnValue({
      data: { growth: empty },
      isError: false,
    });
    const { container } = renderWithProviders(<LibraryGrowthWidget />);
    expect(container).toBeEmptyDOMElement();
  });
});
