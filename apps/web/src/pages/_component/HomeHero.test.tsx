import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, fireEvent, screen, waitFor } from "@testing-library/react";
import type {
  DashboardHeroItem,
  DashboardHeroResponse,
} from "@rawkoon/shared/types";
import { renderWithProviders } from "@/test-utils/render";
import { HomeHero } from "@/pages/_component/HomeHero";
import en from "@/locales/en/common.json";
import fr from "@/locales/fr/common.json";

vi.mock("@tanstack/react-router", () => ({
  Link: ({
    children,
    to,
    params,
    className,
  }: {
    children: React.ReactNode;
    to: string;
    params?: Record<string, string>;
    className?: string;
  }) => (
    <a
      href={to.replace("$libraryId", params?.libraryId ?? "")}
      className={className}
    >
      {children}
    </a>
  ),
}));

// happy-dom cancels WAAPI animations noisily; the carousel logic is what's under test.
vi.mock("motion/react", async () => {
  const React = await import("react");
  const strip = (tag: string) =>
    React.forwardRef<HTMLElement, Record<string, unknown>>(
      function MotionStub(props, ref) {
        const rest = { ...props };
        for (const k of ["initial", "animate", "exit", "transition"]) {
          delete rest[k];
        }
        return React.createElement(tag, { ...rest, ref });
      },
    );
  return {
    motion: { div: strip("div"), img: strip("img") },
    AnimatePresence: ({ children }: { children: React.ReactNode }) => children,
  };
});

const auth = vi.hoisted(() => ({ isAdmin: false }));
vi.mock("@/lib/auth/useAuth", () => ({
  useCurrentUser: () => ({ data: { id: 1, is_admin: auth.isAdmin } }),
}));

vi.mock("@/pages/medias/_component/ExploreCardDetailDialog", () => ({
  ExploreCardDetailDialog: ({ item }: { item: { tmdb_id: number } }) => (
    <div data-testid="detail-dialog">detail:{item.tmdb_id}</div>
  ),
}));

const item = (
  n: number,
  over: Partial<DashboardHeroItem> = {},
): DashboardHeroItem => ({
  library_id: n,
  tmdb_id: n * 10,
  media_type: "movie",
  title: `Film ${n}`,
  overview: null,
  backdrop_url: `https://img/b${n}.jpg`,
  poster_url: null,
  arrived_at: new Date(Date.now() - 3 * 3_600_000).toISOString(),
  season_number: null,
  episode_number: null,
  year: 2021,
  ...over,
});

const render = (payload: DashboardHeroResponse | Error) => {
  const fetcher = vi.fn((url: string) =>
    payload instanceof Error
      ? Promise.reject(payload)
      : Promise.resolve(
          url.startsWith("/api/dashboard/hero") ? payload : { item: {} },
        ),
  );
  return renderWithProviders(<HomeHero userName="Sam" />, { fetcher });
};

const mockReducedMotion = (matches: boolean) =>
  vi.mocked(window.matchMedia).mockImplementation(
    (query: string) =>
      ({
        matches,
        media: query,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      }) as unknown as MediaQueryList,
  );

beforeEach(() => mockReducedMotion(false));

afterEach(() => {
  vi.useRealTimers();
});

describe("HomeHero", () => {
  it("shows an arrival with greeting, kicker, relative time and Details", async () => {
    render({
      source: "arrivals",
      items: [
        item(1, {
          media_type: "tv",
          season_number: 1,
          episode_number: 4,
        }),
      ],
    });
    expect(
      await screen.findByText("dashboard.hero.kicker.arrivals"),
    ).toBeInTheDocument();
    expect(screen.getByText("Film 1")).toBeInTheDocument();
    expect(
      screen.getByText(/dashboard\.hero\.arrived relative:.* · S01E04/),
    ).toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 1 }).textContent).toMatch(
      /, Sam$/,
    );
    expect(
      screen.getByRole("link", { name: "dashboard.hero.details" }),
    ).toHaveAttribute("href", "/library/1");
    expect(
      screen.queryByRole("button", { name: "dashboard.hero.add" }),
    ).toBeNull();
  });

  it("offers Add and Details for a for-you pick", async () => {
    render({
      source: "for_you",
      items: [item(2, { library_id: null, arrived_at: null })],
    });
    expect(
      await screen.findByText("dashboard.hero.kicker.forYou"),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "dashboard.hero.add" }),
    ).toBeInTheDocument();
    fireEvent.click(
      screen.getByRole("button", { name: "dashboard.hero.details" }),
    );
    expect(screen.getByTestId("detail-dialog")).toHaveTextContent("detail:20");
  });

  it.each([
    [false, "/api/requests"],
    [true, "/api/library"],
  ])("Add for admin=%s posts to %s", async (isAdmin, endpoint) => {
    auth.isAdmin = isAdmin;
    const { fetcher } = render({
      source: "for_you",
      items: [item(2, { library_id: null, arrived_at: null })],
    });
    fireEvent.click(
      await screen.findByRole("button", { name: "dashboard.hero.add" }),
    );
    await waitFor(() =>
      expect(fetcher).toHaveBeenCalledWith(
        endpoint,
        expect.objectContaining({ method: "POST" }),
      ),
    );
    expect(
      await screen.findByText(
        isAdmin ? "dashboard.hero.added" : "requests.requested",
      ),
    ).toBeInTheDocument();
    auth.isAdmin = false;
  });

  it("labels a trending pick", async () => {
    render({
      source: "trending",
      items: [item(3, { library_id: null, arrived_at: null })],
    });
    expect(
      await screen.findByText("dashboard.hero.kicker.trending"),
    ).toBeInTheDocument();
  });

  it.each([
    ["no items", { source: "arrivals", items: [] } as DashboardHeroResponse],
    ["an error", new Error("boom")],
  ])("renders only the greeting on %s", async (_label, payload) => {
    const { fetcher } = render(payload);
    await waitFor(() => expect(fetcher).toHaveBeenCalled());
    expect(screen.getByRole("heading", { level: 1 })).toBeInTheDocument();
    expect(screen.queryByTestId("home-hero")).toBeNull();
  });

  it("rotates every 8 seconds, pauses on hover and follows the dots", async () => {
    render({ source: "arrivals", items: [item(1), item(2), item(3)] });
    await screen.findByText("Film 1");

    // Swap to fake timers, then bounce hover so the rotation timer is re-armed on them.
    vi.useFakeTimers();
    const hero = screen.getByTestId("home-hero");
    fireEvent.pointerEnter(hero, { pointerType: "mouse" });
    fireEvent.pointerLeave(hero, { pointerType: "mouse" });
    act(() => {
      vi.advanceTimersByTime(8000);
    });
    expect(screen.getByText("Film 2")).toBeInTheDocument();

    fireEvent.pointerEnter(hero, { pointerType: "mouse" });
    act(() => {
      vi.advanceTimersByTime(30_000);
    });
    expect(screen.getByText("Film 2")).toBeInTheDocument();
    fireEvent.pointerLeave(hero, { pointerType: "mouse" });

    fireEvent.click(
      screen.getByRole("button", { name: "dashboard.hero.goTo title:Film 1" }),
    );
    expect(screen.getByText("Film 1")).toBeInTheDocument();
    act(() => {
      vi.advanceTimersByTime(8000);
    });
    expect(screen.getByText("Film 2")).toBeInTheDocument();
  });

  it("does not auto-rotate under reduced motion", async () => {
    mockReducedMotion(true);
    render({ source: "arrivals", items: [item(1), item(2)] });
    await screen.findByText("Film 1");

    vi.useFakeTimers();
    act(() => {
      vi.advanceTimersByTime(60_000);
    });
    expect(screen.getByText("Film 1")).toBeInTheDocument();
  });
});

describe("hero strings", () => {
  it.each([
    ["en", en],
    ["fr", fr],
  ] as const)("%s has every hero key", (_lang, bundle) => {
    const hero = bundle.dashboard.hero;
    expect(Object.keys(hero).sort()).toEqual(
      [
        "add",
        "added",
        "addFailed",
        "arrived",
        "details",
        "goTo",
        "kicker",
      ].sort(),
    );
    expect(Object.keys(hero.kicker).sort()).toEqual(
      ["arrivals", "forYou", "trending"].sort(),
    );
  });
});
