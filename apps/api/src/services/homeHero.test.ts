import { describe, expect, it } from "bun:test";
import type { DiscoverDeckItem } from "@rawkoon/shared/types";
import {
  buildHomeHero,
  type HeroArrivalCandidate,
  type HomeHeroDeps,
} from "./homeHero";

const NOW = new Date("2026-10-13T12:00:00Z");

const arrival = (
  id: number,
  over: Partial<HeroArrivalCandidate> = {},
): HeroArrivalCandidate => ({
  libraryId: id,
  tmdbId: id * 10,
  mediaType: "movie",
  title: `Title ${id}`,
  overview: "Plot",
  posterUrl: `https://img/p${id}.jpg`,
  year: 2020,
  overrideBackdropUrl: null,
  arrivedAt: new Date(NOW.getTime() - id * 3_600_000),
  seasonNumber: null,
  episodeNumber: null,
  ...over,
});

const deckItem = (
  id: number,
  backdrop: string | undefined,
): DiscoverDeckItem => ({
  id: `movie-${id}`,
  tmdb_id: id,
  media_type: "movie",
  title: `Pick ${id}`,
  release_year: 2024,
  poster_url: null,
  ...(backdrop ? { backdrop_url: backdrop } : {}),
  overview: null,
  vote_average: null,
  genre_ids: [],
});

function makeDeps(over: Partial<HomeHeroDeps> = {}): HomeHeroDeps {
  return {
    loadArrivals: async () => [],
    loadTmdbBackdrop: async (_t, id) => `https://img/b${id}.jpg`,
    loadDeck: async () => ({ source: "trending", items: [] }),
    ...over,
  };
}

describe("buildHomeHero", () => {
  it("serves arrivals newest first, capped at five", async () => {
    const res = await buildHomeHero(
      makeDeps({
        loadArrivals: async () => [1, 2, 3, 4, 5, 6, 7].map((i) => arrival(i)),
      }),
      NOW,
    );
    expect(res.source).toBe("arrivals");
    expect(res.items.map((i) => i.library_id)).toEqual([1, 2, 3, 4, 5]);
    expect(res.items[0]).toMatchObject({
      tmdb_id: 10,
      media_type: "movie",
      backdrop_url: "https://img/b10.jpg",
      arrived_at: "2026-10-13T11:00:00.000Z",
    });
  });

  it("asks for a seven day window", async () => {
    let since: Date | null = null;
    await buildHomeHero(
      makeDeps({
        loadArrivals: async (s) => {
          since = s;
          return [];
        },
      }),
      NOW,
    );
    expect(since!.toISOString()).toBe("2026-10-06T12:00:00.000Z");
  });

  it("prefers the override backdrop and skips titles with none", async () => {
    const res = await buildHomeHero(
      makeDeps({
        loadArrivals: async () => [
          arrival(1, { overrideBackdropUrl: "https://img/override.jpg" }),
          arrival(2),
          arrival(3),
        ],
        loadTmdbBackdrop: async (_t, id) =>
          id === 20 ? null : `https://img/b${id}.jpg`,
      }),
      NOW,
    );
    expect(res.items.map((i) => [i.library_id, i.backdrop_url])).toEqual([
      [1, "https://img/override.jpg"],
      [3, "https://img/b30.jpg"],
    ]);
  });

  it("treats a failing backdrop lookup as no backdrop", async () => {
    const res = await buildHomeHero(
      makeDeps({
        loadArrivals: async () => [arrival(1), arrival(2)],
        loadTmdbBackdrop: async (_t, id) => {
          if (id === 10) throw new Error("boom");
          return "https://img/ok.jpg";
        },
      }),
      NOW,
    );
    expect(res.items.map((i) => i.library_id)).toEqual([2]);
  });

  it("carries episode info through", async () => {
    const res = await buildHomeHero(
      makeDeps({
        loadArrivals: async () => [
          arrival(1, { mediaType: "tv", seasonNumber: 1, episodeNumber: 4 }),
        ],
      }),
      NOW,
    );
    expect(res.items[0]).toMatchObject({
      media_type: "tv",
      season_number: 1,
      episode_number: 4,
    });
  });

  it("falls back to a personalized deck as for_you", async () => {
    const res = await buildHomeHero(
      makeDeps({
        loadDeck: async () => ({
          source: "personalized",
          items: [1, 2, 3, 4, 5, 6, 7].map((i) => deckItem(i, `b${i}`)),
        }),
      }),
      NOW,
    );
    expect(res.source).toBe("for_you");
    expect(res.items).toHaveLength(5);
    expect(res.items[0]).toMatchObject({
      library_id: null,
      arrived_at: null,
      backdrop_url: "b1",
      year: 2024,
    });
  });

  it("falls back to trending and drops deck items without a backdrop", async () => {
    const res = await buildHomeHero(
      makeDeps({
        loadDeck: async () => ({
          source: "trending",
          items: [deckItem(1, undefined), deckItem(2, "b2")],
        }),
      }),
      NOW,
    );
    expect(res.source).toBe("trending");
    expect(res.items.map((i) => i.tmdb_id)).toEqual([2]);
  });

  it("returns an empty deck when TMDB is not configured", async () => {
    const res = await buildHomeHero(
      makeDeps({ loadDeck: async () => null }),
      NOW,
    );
    expect(res.items).toEqual([]);
  });
});
