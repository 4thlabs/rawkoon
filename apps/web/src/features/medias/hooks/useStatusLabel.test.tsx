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
  enabled: true,
  connected: true,
  items: [
    { id: 1, media_id: 5, progress: 0.426 },
    { id: 2, media_id: 6, progress: 0.9 },
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
