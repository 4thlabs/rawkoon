import { describe, expect, it, vi } from "vitest";
import { QueryClient } from "@tanstack/react-query";
import type { LandedArrival } from "@rawkoon/shared/types";
import { queryKeys } from "@/lib/queryKeys";
import { recordLanded } from "@/features/medias/hooks/useLandedArrivals";

const arrival: LandedArrival = {
  mediaId: 1,
  mediaType: "movie",
  title: "Film",
  posterUrl: null,
  season: null,
  episode: null,
  episodeCount: null,
  ts: 0,
};

describe("recordLanded", () => {
  it("stamps the receipt time instead of the server's", () => {
    vi.useFakeTimers();
    vi.setSystemTime(1_000_000);
    const qc = new QueryClient();
    recordLanded(qc, arrival);
    expect(qc.getQueryData<LandedArrival[]>(queryKeys.home.landed())).toEqual([
      { ...arrival, ts: 1_000_000 },
    ]);
    vi.useRealTimers();
  });

  it("keeps the store from being garbage-collected while Home is unmounted", () => {
    const qc = new QueryClient();
    recordLanded(qc, arrival);
    expect(qc.getQueryDefaults(queryKeys.home.landed()).gcTime).toBe(Infinity);
  });
});
