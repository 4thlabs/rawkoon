import { describe, it, expect, vi } from "vitest";
import { screen } from "@testing-library/react";
import { renderWithProviders } from "@/test-utils/render";
import { ContinueListeningWidget } from "./ContinueListeningWidget";

const progress = vi.hoisted(() => ({ rows: [] as unknown[] }));

vi.mock("@tanstack/react-router", () => ({
  useNavigate: () => vi.fn(),
  Link: ({ children, to }: { children: React.ReactNode; to: string }) => (
    <a href={to}>{children}</a>
  ),
}));
vi.mock("@/features/player/PlayerProvider", () => ({
  usePlayer: () => ({ load: vi.fn() }),
}));
vi.mock("@/features/player/usePlayback", () => ({
  useListeningProgress: () => ({
    data: { progress: progress.rows },
    isLoading: false,
    isError: false,
  }),
  useReadingProgress: () => ({
    data: { progress: [] },
    isLoading: false,
    isError: false,
  }),
}));
vi.mock("@/pages/books/_component/BookCover", () => ({
  BookCover: () => null,
}));

const row = (n: number) => ({
  edition_id: n,
  book_id: n,
  title: `Book ${n}`,
  authors: ["A"],
  cover_url: null,
  updated_at: `2026-10-0${n}T00:00:00Z`,
  position_secs: 100,
  total_duration_secs: 1000,
  finished: false,
});

describe("ContinueListeningWidget", () => {
  it("shows two cards and a See all link to Books when there are more", () => {
    progress.rows = [row(1), row(2), row(3)];
    renderWithProviders(<ContinueListeningWidget />);
    expect(screen.getAllByRole("button")).toHaveLength(2);
    expect(screen.getByRole("link")).toHaveAttribute("href", "/books");
  });

  it("has no See all link with a single item", () => {
    progress.rows = [row(1)];
    renderWithProviders(<ContinueListeningWidget />);
    expect(screen.getAllByRole("button")).toHaveLength(1);
    expect(screen.queryByRole("link")).toBeNull();
  });
});
