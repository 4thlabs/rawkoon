import { beforeEach, describe, it, expect, vi } from "vitest";
import { fireEvent, screen, waitFor } from "@testing-library/react";
import { renderWithProviders } from "@/test-utils/render";
import { DownloadsPanel } from "@/pages/_component/DownloadsPanel";

vi.mock("@tanstack/react-router", () => ({
  Link: ({
    children,
    params,
    className,
  }: {
    children: React.ReactNode;
    params?: { libraryId?: string };
    className?: string;
  }) => (
    <a href={`/library/${params?.libraryId}`} className={className}>
      {children}
    </a>
  ),
}));

const auth = vi.hoisted(() => ({ isAdmin: true }));
vi.mock("@/lib/auth/useAuth", () => ({
  useCurrentUser: () => ({ data: { id: 1, is_admin: auth.isAdmin } }),
}));

const toastSpy = vi.hoisted(() => vi.fn());
vi.mock("sonner", () => ({ toast: toastSpy }));

beforeEach(() => {
  auth.isAdmin = true;
  toastSpy.mockClear();
});

const speed = {
  enabled: true,
  connected: true,
  dl_speed: 2_000_000,
  ul_speed: 0,
};

const activeItem = {
  id: 4,
  media_id: 9,
  media_title: "Some Show",
  media_type: "show" as const,
  poster_url: null,
  season: 2,
  episode: 5,
  release_title: "Some.Show.S02E05.1080p.WEB",
  progress: 0.426,
  state: "downloading",
  download_speed: 1_500_000,
  eta_seconds: 600,
};

const pendingItem = {
  target_key: "m:3",
  media_id: 3,
  media_title: "Held Movie",
  poster_url: null,
  season: null,
  episode: null,
  release_title: "Held.Movie.2024.2160p",
  candidate_count: 2,
  grab_after: new Date(Date.now() + 25 * 60_000).toISOString(),
};

function fetcherFor(opts: {
  active?: unknown[];
  pending?: unknown[];
  enabled?: boolean;
}) {
  const enabled = opts.enabled ?? true;
  return vi.fn().mockImplementation((url: string) => {
    if (url.endsWith("/downloads/speed"))
      return Promise.resolve(enabled ? speed : { ...speed, enabled: false });
    if (url.endsWith("/downloads/active"))
      return Promise.resolve({
        enabled,
        connected: enabled,
        items: opts.active ?? [],
      });
    if (url.endsWith("/pending-releases/grab-now"))
      return Promise.resolve({ grabbed: true });
    if (url.endsWith("/pending-releases"))
      return Promise.resolve({ items: opts.pending ?? [] });
    return Promise.resolve({});
  });
}

describe("DownloadsPanel", () => {
  it("lists active grabs with percent, speed, ETA and a link to the item", async () => {
    renderWithProviders(<DownloadsPanel />, {
      fetcher: fetcherFor({ active: [activeItem] }),
    });
    const link = await screen.findByRole("link", { name: "Some Show S02E05" });
    expect(link).toHaveAttribute("href", "/library/9");
    expect(screen.getByText("Some.Show.S02E05.1080p.WEB")).toBeInTheDocument();
    expect(screen.getByText("42%")).toBeInTheDocument();
    expect(screen.getByRole("progressbar")).toHaveAttribute(
      "aria-valuenow",
      "42",
    );
    expect(screen.getByText(/1\.4 MB\/s|1\.5 MB\/s/)).toBeInTheDocument();
    expect(screen.getByText(/dashboard\.home\.etaLeft/)).toBeInTheDocument();
    // Total speed stays in the header.
    expect(
      screen.getByText(/1\.9 MB\/s|2 MB\/s|2\.0 MB\/s/),
    ).toBeInTheDocument();
  });

  it("shows a held release with a grab-now action that posts its target", async () => {
    const fetcher = fetcherFor({ pending: [pendingItem] });
    renderWithProviders(<DownloadsPanel />, { fetcher });
    await screen.findByText("Held Movie");
    expect(
      screen.getByText("dashboard.home.pendingDelay (1)"),
    ).toBeInTheDocument();
    fireEvent.click(
      screen.getByRole("button", { name: "dashboard.home.grabNow" }),
    );
    await waitFor(() =>
      expect(fetcher).toHaveBeenCalledWith(
        "/api/downloads/pending-releases/grab-now",
        { method: "POST", body: { target_key: "m:3" } },
      ),
    );
  });

  it("shows the empty state when nothing is downloading or held", async () => {
    renderWithProviders(<DownloadsPanel />, { fetcher: fetcherFor({}) });
    expect(
      await screen.findByText("dashboard.home.nothingDownloading"),
    ).toBeInTheDocument();
  });

  it("toasts the reason when grab-now grabs nothing", async () => {
    const base = fetcherFor({ pending: [pendingItem] });
    const fetcher = vi
      .fn()
      .mockImplementation((url: string) =>
        url.endsWith("/grab-now")
          ? Promise.resolve({ grabbed: false, reason: "already_active" })
          : base(url),
      );
    renderWithProviders(<DownloadsPanel />, { fetcher });
    await screen.findByText("Held Movie");
    fireEvent.click(
      screen.getByRole("button", { name: "dashboard.home.grabNow" }),
    );
    await waitFor(() =>
      expect(toastSpy).toHaveBeenCalledWith("dashboard.home.nothingGrabbed", {
        description: "dashboard.home.grabMiss.already_active",
      }),
    );
  });

  it("shows a non-admin the speed total only, without polling the admin lists", async () => {
    auth.isAdmin = false;
    const fetcher = fetcherFor({
      active: [activeItem],
      pending: [pendingItem],
    });
    renderWithProviders(<DownloadsPanel />, { fetcher });
    await screen.findByText(/MB\/s/);
    expect(screen.queryByText("Some Show S02E05")).not.toBeInTheDocument();
    expect(screen.queryByText("Held Movie")).not.toBeInTheDocument();
    expect(
      screen.queryByText("dashboard.home.nothingDownloading"),
    ).not.toBeInTheDocument();
    const urls = fetcher.mock.calls.map((c) => String(c[0]));
    expect(urls.some((u) => u.endsWith("/downloads/active"))).toBe(false);
    expect(urls.some((u) => u.endsWith("/pending-releases"))).toBe(false);
  });

  it("explains a missing download client", async () => {
    renderWithProviders(<DownloadsPanel />, {
      fetcher: fetcherFor({ enabled: false }),
    });
    expect(
      await screen.findByText("dashboard.home.downloadClientNotConfigured"),
    ).toBeInTheDocument();
  });
});
