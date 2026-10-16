import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, fireEvent, render, screen } from "@testing-library/react";
import { FindPage } from "../FindPage";

const navigate = vi.fn();
let search: { q?: string } = {};

vi.mock("@tanstack/react-router", () => ({
  useNavigate: () => navigate,
  useSearch: () => search,
  Link: ({ children }: { children: React.ReactNode }) => <a>{children}</a>,
}));
vi.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (k: string) => k }),
}));
vi.mock("@/components/PageLayout", () => ({
  PageLayout: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
}));
vi.mock("@/pages/medias/_component/DiscoverPanel", () => ({
  DiscoverPanel: () => <div data-testid="browse-grid" />,
}));
vi.mock("../FindResults", () => ({
  FindResults: ({ query }: { query: string }) => (
    <div data-testid="results">{query}</div>
  ),
}));
vi.mock("../FindShelves", () => ({ FindShelves: () => <div /> }));
vi.mock("../FindModeSwitch", () => ({ FindModeSwitch: () => <div /> }));

describe("FindPage", () => {
  beforeEach(() => {
    navigate.mockReset();
    search = {};
    vi.useFakeTimers();
  });
  afterEach(() => vi.useRealTimers());

  it("shows the browse grid until a query is long enough", () => {
    render(<FindPage />);
    expect(screen.getByTestId("browse-grid")).toBeTruthy();
    expect(screen.queryByTestId("results")).toBeNull();
  });

  it("shows grouped results for a query in the URL and fills the field", () => {
    search = { q: "severance" };
    render(<FindPage />);
    expect(screen.getByTestId("results").textContent).toBe("severance");
    expect(screen.queryByTestId("browse-grid")).toBeNull();
    expect((screen.getByRole("searchbox") as HTMLInputElement).value).toBe(
      "severance",
    );
  });

  it("writes the typed query to the URL after a pause, replacing history", () => {
    render(<FindPage />);
    fireEvent.change(screen.getByRole("searchbox"), {
      target: { value: "dune" },
    });
    expect(navigate).not.toHaveBeenCalled();
    act(() => {
      vi.advanceTimersByTime(400);
    });
    expect(navigate).toHaveBeenCalledWith(
      expect.objectContaining({
        to: "/find",
        replace: true,
        search: expect.objectContaining({ q: "dune" }),
      }),
    );
  });
});
