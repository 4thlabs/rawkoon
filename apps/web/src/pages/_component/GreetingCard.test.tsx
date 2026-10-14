import { describe, expect, it } from "vitest";
import { act, renderWithProviders, screen } from "@/test-utils/render";
import { recordLanded } from "@/features/medias/hooks/useLandedArrivals";
import { GreetingCard } from "@/pages/_component/GreetingCard";

const arrival = {
  mediaId: 1,
  mediaType: "tv" as const,
  title: "Show",
  posterUrl: null,
  season: 1,
  episode: 4,
  episodeCount: null,
};

describe("GreetingCard just landed", () => {
  it("keeps the time-of-day subtitle when nothing landed", () => {
    renderWithProviders(<GreetingCard userName="Sam" />);
    expect(screen.queryByText(/dashboard\.landed/)).not.toBeInTheDocument();
    expect(screen.getByText(/dashboard\.greetingSubtitle\./)).toBeTruthy();
  });

  it("names a fresh arrival with its code", async () => {
    const { queryClient } = renderWithProviders(<GreetingCard userName="" />);
    await act(async () =>
      recordLanded(queryClient, { ...arrival, ts: Date.now() }),
    );
    expect(
      await screen.findByText(
        "dashboard.landed.subtitle title:Show code:S01E04",
      ),
    ).toBeInTheDocument();
  });

  it("drops the code for a movie", async () => {
    const { queryClient } = renderWithProviders(<GreetingCard userName="" />);
    await act(async () =>
      recordLanded(queryClient, {
        ...arrival,
        mediaType: "movie",
        season: null,
        episode: null,
        ts: Date.now(),
      }),
    );
    expect(
      await screen.findByText(
        "dashboard.landed.subtitleNoCode title:Show code:",
      ),
    ).toBeInTheDocument();
  });

  it("falls back once the arrival is older than 30 minutes", () => {
    const { queryClient } = renderWithProviders(<GreetingCard userName="" />);
    act(() =>
      recordLanded(queryClient, { ...arrival, ts: Date.now() - 31 * 60_000 }),
    );
    expect(screen.queryByText(/dashboard\.landed/)).not.toBeInTheDocument();
  });
});
