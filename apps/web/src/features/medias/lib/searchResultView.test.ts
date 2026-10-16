import { describe, expect, it } from "vitest";
import {
  outcomeRank,
  searchResultView,
  shortReleaseTitle,
  type SearchResultViewContext,
} from "./searchResultView";

// Echo the key and params so the tests check which message is chosen, not its copy.
const t = (key: string, params?: Record<string, unknown>) =>
  params ? `${key}|${JSON.stringify(params)}` : key;

const ctx = (over: Partial<SearchResultViewContext> = {}) => ({
  t,
  language: "en",
  profileName: null,
  isShow: false,
  ...over,
});

describe("shortReleaseTitle", () => {
  it("keeps the name and year, drops the quality tags", () => {
    expect(shortReleaseTitle("Some.Movie.2024.1080p.WEB-DL.DDP5.1-GRP")).toBe(
      "Some Movie 2024",
    );
  });

  it("falls back to the whole title when it starts with a tag", () => {
    expect(shortReleaseTitle("1080p.Something")).toBe("1080p.Something");
  });

  it("truncates a very long name", () => {
    const out = shortReleaseTitle(`${"Word ".repeat(30)}1080p`, 20);
    expect(out.length).toBeLessThanOrEqual(20);
    expect(out.endsWith("…")).toBe(true);
  });
});

describe("searchResultView", () => {
  it("shows the grabbed release with its quality and offers View and Change release", () => {
    const view = searchResultView(ctx(), {
      media_id: 1,
      outcome: "grabbed",
      release: {
        title: "Some.Movie.2024.1080p.WEB-DL-GRP",
        resolution: 1080,
        source: "WEB-DL",
        size_bytes: 7_800_000_000,
      },
    });
    expect(view.variant).toBe("success");
    expect(view.message).toContain("medias.searchToast.grabbing|");
    expect(view.message).toContain("1080p WEB-DL 7.8 GB");
    expect(view.message).toContain("Some Movie 2024");
    expect(view.actions).toEqual(["view", "changeRelease"]);
  });

  it("omits quality it does not know", () => {
    const view = searchResultView(ctx(), {
      media_id: 1,
      outcome: "grabbed",
      release: {
        title: "Plain",
        resolution: null,
        source: null,
        size_bytes: null,
      },
    });
    expect(view.message).toContain("medias.searchToast.grabbingPlain");
  });

  it("explains a held grab and offers Grab now, never an error style", () => {
    const view = searchResultView(ctx(), {
      media_id: 1,
      outcome: "delayed",
      delay_until: "2026-10-16T18:30:00.000Z",
    });
    expect(view.variant).toBe("info");
    expect(view.message).toContain("medias.searchToast.held");
    expect(view.actions).toEqual(["grabNow"]);
  });

  it("treats a miss as neutral and names the profile", () => {
    const view = searchResultView(ctx({ profileName: "HD" }), {
      media_id: 1,
      outcome: "no_match",
      reason: "No matching releases found",
    });
    expect(view.variant).toBe("info");
    expect(view.message).toBe('medias.searchToast.noFit|{"profile":"HD"}');
    expect(view.actions).toEqual(["choose"]);
  });

  it("says no release was found when the item has no profile", () => {
    const view = searchResultView(ctx(), {
      media_id: 1,
      outcome: "no_match",
    });
    expect(view.message).toBe("medias.searchToast.noRelease");
  });

  it("uses the language-fallback wording when other versions exist", () => {
    const view = searchResultView(ctx(), {
      media_id: 1,
      outcome: "no_match",
      language_fallback_summary: { missing: ["VFQ"], counts: { VFF: 2 } },
    });
    expect(view.variant).toBe("info");
    expect(view.message).toContain("languageFallbackMissFrench");
    expect(view.actions).toEqual(["choose"]);
  });

  it("names the release day for a title that is not out yet", () => {
    const movie = searchResultView(ctx(), {
      media_id: 1,
      outcome: "not_released",
      delay_until: "2031-03-04T00:00:00.000Z",
    });
    expect(movie.message).toContain("medias.searchToast.notReleased|");
    expect(movie.message).toContain("Mar 4, 2031");
    expect(movie.actions).toEqual([]);

    const show = searchResultView(ctx({ isShow: true }), {
      media_id: 1,
      outcome: "not_released",
    });
    expect(show.message).toBe("medias.searchToast.notAiredYetNoDate");
  });

  it("reserves the error style for a real failure", () => {
    const view = searchResultView(ctx(), {
      media_id: 1,
      outcome: "error",
      reason: "No indexer manager configured",
    });
    expect(view.variant).toBe("error");
    expect(view.message).toContain("failedWithReason");
  });
});

describe("outcomeRank", () => {
  it("ranks a grab above a held grab above a miss above a wait above a failure", () => {
    const order = [
      "grabbed",
      "delayed",
      "no_match",
      "not_released",
      "error",
    ] as const;
    const ranks = order.map(outcomeRank);
    expect([...ranks].sort((a, b) => b - a)).toEqual(ranks);
  });
});
