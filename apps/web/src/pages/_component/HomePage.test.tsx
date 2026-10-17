import { describe, it, expect, vi } from "vitest";
import { screen } from "@testing-library/react";
import { renderWithProviders } from "@/test-utils/render";
import { HomePage } from "@/pages/_component/HomePage";

vi.mock("@/lib/auth/useAuth", () => ({
  useCurrentUser: () => ({
    data: { id: 1, email: "test@example.com", first_name: "Test" },
  }),
  useAuth: () => ({ user: null, isAuthenticated: false, isLoading: false }),
}));

vi.mock("@/lib/routing/useFeatures", () => ({
  useFeatures: () => ({ data: { books_enabled: true } }),
}));
vi.mock("@/features/medias/hooks/useLibraryEvents", () => ({
  useLibraryEvents: () => {},
}));
vi.mock("@/pages/_component/RecentlyAddedRail", () => ({
  RecentlyAddedRail: () => <div data-testid="s-recent" />,
}));
vi.mock("@/pages/_component/UpcomingRail", () => ({
  UpcomingRail: () => <div data-testid="s-upcoming" />,
}));
vi.mock("@/pages/_component/PipelineCard", () => ({
  PipelineCard: () => <div data-testid="s-pipeline" />,
}));
vi.mock("@/features/listening/BooksCard", () => ({
  BooksCard: () => <div data-testid="s-books" />,
}));
vi.mock("@/features/continue/ContinueListeningWidget", () => ({
  ContinueListeningWidget: () => <div data-testid="s-continue" />,
}));

describe("HomePage", () => {
  it("renders all media-home sections in order", () => {
    renderWithProviders(<HomePage />);
    const order = [
      "s-continue",
      "s-pipeline",
      "s-books",
      "s-recent",
      "s-upcoming",
    ];
    const present = order.filter((id) => screen.queryByTestId(id));
    expect(present).toEqual(order);
  });
});
