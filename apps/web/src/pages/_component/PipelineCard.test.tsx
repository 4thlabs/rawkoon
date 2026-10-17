import { describe, expect, it, vi, beforeEach } from "vitest";
import { fireEvent, screen } from "@testing-library/react";
import type { DashboardPipeline } from "@rawkoon/shared/types";
import { renderWithProviders } from "@/test-utils/render";
import { PipelineCard } from "@/pages/_component/PipelineCard";

vi.mock("@tanstack/react-router", () => ({
  Link: ({
    children,
    to,
    className,
    ...rest
  }: {
    children: React.ReactNode;
    to: string;
    className?: string;
  }) => (
    <a href={to} className={className} {...rest}>
      {children}
    </a>
  ),
}));

const auth = vi.hoisted(() => ({ isAdmin: true }));
vi.mock("@/lib/auth/useAuth", () => ({
  useCurrentUser: () => ({ data: { id: 1, is_admin: auth.isAdmin } }),
}));

const idle: DashboardPipeline = {
  downloading: { available: true, count: 0, speed_bytes_per_sec: 0, items: [] },
  delayed: { available: true, count: 0 },
  attention: { available: true, count: 0, alerts: 0, gave_up: 0 },
  rss: {
    available: true,
    last_run_at: null,
    ok: null,
    releases_found: null,
    next_run_at: null,
  },
  reencode: { available: true, active: 0, queued: 0 },
};

const active: DashboardPipeline = {
  ...idle,
  downloading: {
    available: true,
    count: 2,
    speed_bytes_per_sec: 5_000_000,
    items: [
      {
        id: 1,
        library_media_id: 1,
        book_id: null,
        title: "Film A",
        progress: 0.4,
        eta_seconds: 600,
      },
      {
        id: 2,
        library_media_id: 2,
        book_id: null,
        title: "Film B",
        progress: 0.9,
        eta_seconds: null,
      },
    ],
  },
  delayed: { available: true, count: 1 },
  attention: { available: true, count: 3, alerts: 2, gave_up: 1 },
};

const render = (data: DashboardPipeline | Error) => {
  const fetcher = vi.fn(() =>
    data instanceof Error ? Promise.reject(data) : Promise.resolve(data),
  );
  return renderWithProviders(<PipelineCard />, { fetcher });
};

beforeEach(() => {
  auth.isAdmin = true;
});

describe("PipelineCard", () => {
  it("renders nothing, and fetches nothing, for a member", () => {
    auth.isAdmin = false;
    const { container, fetcher } = render(idle);
    expect(container).toBeEmptyDOMElement();
    expect(fetcher).not.toHaveBeenCalled();
  });

  it("shows live work with items, progress and a lamp that breathes", async () => {
    render(active);
    const row = await screen.findByTestId("pipeline-row-downloading");
    expect(row).toHaveAttribute("href", "/activity/queue");
    expect(row).toHaveAttribute("data-state", "active");
    expect(screen.getByText("Film A")).toBeInTheDocument();
    expect(screen.getByRole("progressbar", { name: "Film A" })).toHaveAttribute(
      "aria-valuenow",
      "40",
    );
    expect(
      row.querySelector("span.motion-safe\\:animate-pulse"),
    ).not.toBeNull();
    expect(screen.getByTestId("pipeline-row-attention")).toHaveAttribute(
      "href",
      "/settings/health",
    );
    expect(
      screen.getByText("dashboard.pipeline.attentionSplit alerts:2 gaveUp:1"),
    ).toBeInTheDocument();
  });

  it("keeps idle rows, muted, and nothing breathes", async () => {
    const { container } = render(idle);
    const row = await screen.findByTestId("pipeline-row-downloading");
    expect(row).toHaveAttribute("data-state", "idle");
    expect(
      screen.getByText("dashboard.pipeline.nothingDownloading"),
    ).toBeInTheDocument();
    expect(screen.getAllByTestId(/pipeline-row-/)).toHaveLength(5);
    expect(container.querySelector(".motion-safe\\:animate-pulse")).toBeNull();
  });

  it("says a failed source could not be checked instead of reading idle", async () => {
    render({
      ...idle,
      downloading: { ...idle.downloading, available: false },
    });
    const row = await screen.findByTestId("pipeline-row-downloading");
    expect(row).toHaveAttribute("data-state", "unavailable");
    expect(row).toHaveTextContent("dashboard.pipeline.unavailable");
    expect(row).not.toHaveTextContent("nothingDownloading");
    expect(screen.getByTestId("pipeline-row-delayed")).toHaveAttribute(
      "data-state",
      "idle",
    );
  });

  it("collapses the last two rows on phones and expands them in place", async () => {
    render(idle);
    await screen.findByTestId("pipeline-row-rss");
    expect(screen.getByTestId("pipeline-row-delayed").className).not.toMatch(
      /hidden/,
    );
    expect(screen.getByTestId("pipeline-row-rss").className).toMatch(/hidden/);
    expect(screen.getByTestId("pipeline-row-reencode").className).toMatch(
      /hidden/,
    );
    fireEvent.click(
      screen.getByRole("button", { name: "dashboard.pipeline.more count:2" }),
    );
    expect(screen.getByTestId("pipeline-row-rss").className).not.toMatch(
      /hidden/,
    );
    expect(screen.queryByRole("button", { name: /more/ })).toBeNull();
  });
});
