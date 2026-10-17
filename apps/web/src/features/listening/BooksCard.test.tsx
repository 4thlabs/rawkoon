import { describe, it, expect, vi, beforeEach } from "vitest";
import { screen } from "@testing-library/react";
import { renderWithProviders } from "@/test-utils/render";
import { BooksCard } from "./BooksCard";

const mockUseFeatures = vi.fn();
const mockUseListeningStats = vi.fn();

vi.mock("@/lib/routing/useFeatures", () => ({
  useFeatures: () => mockUseFeatures(),
}));
vi.mock("./useListeningStats", () => ({
  useListeningStats: () => mockUseListeningStats(),
}));
vi.mock("@tanstack/react-router", () => ({
  Link: ({ children, to }: { children: React.ReactNode; to: string }) => (
    <a href={to}>{children}</a>
  ),
}));

const stats = {
  timezone: "America/Toronto",
  today_secs: 0,
  week_secs: 12000,
  streak_days: 3,
  since: "2026-09-01",
  week: [
    { day: "2026-09-01", seconds: 0 },
    { day: "2026-09-02", seconds: 3600 },
  ],
  series: [],
};

beforeEach(() => {
  mockUseFeatures.mockReturnValue({ data: { books_enabled: true } });
  mockUseListeningStats.mockReturnValue({ data: stats, isError: false });
});

describe("BooksCard", () => {
  it("links to the listening page with the week's figures", () => {
    renderWithProviders(<BooksCard />);
    expect(screen.getByRole("link")).toHaveAttribute(
      "href",
      "/books/listening",
    );
    expect(screen.getByText("3")).toBeInTheDocument();
  });

  it("is hidden when books are disabled", () => {
    mockUseFeatures.mockReturnValue({ data: { books_enabled: false } });
    const { container } = renderWithProviders(<BooksCard />);
    expect(container).toBeEmptyDOMElement();
  });

  it("is hidden when stats fail to load", () => {
    mockUseListeningStats.mockReturnValue({ data: undefined, isError: true });
    const { container } = renderWithProviders(<BooksCard />);
    expect(container).toBeEmptyDOMElement();
  });
});
