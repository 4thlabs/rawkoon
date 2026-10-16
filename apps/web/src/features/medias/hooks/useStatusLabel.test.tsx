import { describe, expect, it, vi } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import { renderWithProviders } from "@/test-utils/render";
import { useStatusLabel } from "./useStatusLabel";

function Label({
  id,
  status,
}: {
  id: number;
  status: "downloading" | "wanted";
}) {
  return <span>{useStatusLabel({ id, status }, "label.key")}</span>;
}

const active = {
  items: [
    { id: 1, media_id: 5, episode_id: null, progress: 0.426 },
    { id: 2, media_id: 6, episode_id: 1, progress: 0.9 },
    { id: 3, media_id: 7, episode_id: 2, progress: 0.1 },
    { id: 4, media_id: 7, episode_id: 3, progress: 0.3 },
  ],
};

describe("useStatusLabel", () => {
  it("appends the live percent while the title is downloading", async () => {
    const fetcher = vi.fn().mockResolvedValue(active);
    renderWithProviders(<Label id={5} status="downloading" />, { fetcher });
    await waitFor(() =>
      expect(
        screen.getByText(/medias\.library\.itemStatusPercent/),
      ).toBeInTheDocument(),
    );
  });

  it("counts episodes instead of averaging when several are in flight", async () => {
    const fetcher = vi.fn().mockResolvedValue(active);
    renderWithProviders(<Label id={7} status="downloading" />, { fetcher });
    await waitFor(() =>
      expect(
        screen.getByText(/medias\.library\.itemStatusEpisodes/),
      ).toBeInTheDocument(),
    );
  });

  it("reads the user-visible progress endpoint, not the admin list", async () => {
    const fetcher = vi.fn().mockResolvedValue(active);
    renderWithProviders(<Label id={5} status="downloading" />, { fetcher });
    await waitFor(() => expect(fetcher).toHaveBeenCalled());
    expect(fetcher).toHaveBeenCalledWith("/api/dashboard/downloads/progress");
  });

  it("falls back to the plain label when the title has no active grab", async () => {
    const fetcher = vi.fn().mockResolvedValue(active);
    renderWithProviders(<Label id={99} status="downloading" />, { fetcher });
    await waitFor(() => expect(fetcher).toHaveBeenCalled());
    expect(screen.getByText("label.key")).toBeInTheDocument();
  });

  it("does not fetch for a title that is not downloading", () => {
    const fetcher = vi.fn().mockResolvedValue(active);
    renderWithProviders(<Label id={5} status="wanted" />, { fetcher });
    expect(screen.getByText("label.key")).toBeInTheDocument();
    expect(fetcher).not.toHaveBeenCalled();
  });
});
