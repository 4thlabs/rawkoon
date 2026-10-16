import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { toast } = vi.hoisted(() => ({
  toast: {
    loading: vi.fn(),
    success: vi.fn(),
    info: vi.fn(),
    error: vi.fn(),
  },
}));
vi.mock("sonner", () => ({ toast }));

import {
  applySearchResult,
  isGrabPopupSuppressed,
  resetLiveSearchToasts,
  STILL_SEARCHING_MS,
  trackSearch,
  type LiveSearchContext,
} from "./liveSearchToast";

const ctx = (over: Partial<LiveSearchContext> = {}): LiveSearchContext => ({
  mediaId: 7,
  title: "T",
  profileName: "HD",
  isShow: false,
  t: (key) => key,
  language: "en",
  openItem: vi.fn(),
  grabNow: vi.fn(),
  ...over,
});

beforeEach(() => {
  vi.useFakeTimers();
  Object.values(toast).forEach((fn) => fn.mockClear());
});
afterEach(() => {
  resetLiveSearchToasts();
  vi.useRealTimers();
});

describe("live search toast", () => {
  it("starts as a persistent spinner and updates the same toast in place", () => {
    trackSearch(ctx());
    expect(toast.loading).toHaveBeenCalledWith(
      "medias.searchToast.searching",
      expect.objectContaining({ id: "search-7", duration: Infinity }),
    );

    applySearchResult({ media_id: 7, outcome: "no_match" });
    expect(toast.info).toHaveBeenCalledWith(
      "medias.searchToast.noFit",
      expect.objectContaining({ id: "search-7" }),
    );
    expect(toast.error).not.toHaveBeenCalled();
  });

  it("wires the grab buttons to the item page", () => {
    const openItem = vi.fn();
    trackSearch(ctx({ openItem }));
    applySearchResult({
      media_id: 7,
      outcome: "grabbed",
      release: {
        title: "A.2024.1080p.WEB-DL",
        resolution: 1080,
        source: "WEB-DL",
        size_bytes: 1_000_000_000,
      },
    });
    const options = toast.success.mock.calls[0]![1] as {
      action: { label: string; onClick: () => void };
      cancel: { label: string; onClick: () => void };
    };
    options.action.onClick();
    options.cancel.onClick();
    expect(openItem.mock.calls).toEqual([[false], [true]]);
  });

  it("Grab now runs a manual search for the held season", () => {
    const grabNow = vi.fn();
    trackSearch(ctx({ grabNow, isShow: true }));
    applySearchResult({
      media_id: 7,
      season: 2,
      outcome: "delayed",
      delay_until: "2026-10-16T18:30:00.000Z",
    });
    const options = toast.info.mock.calls[0]![1] as {
      action: { onClick: (e: { preventDefault: () => void }) => void };
    };
    const preventDefault = vi.fn();
    options.action.onClick({ preventDefault });
    expect(grabNow).toHaveBeenCalledWith(2);
    // The new search reuses this toast, so sonner must not dismiss it.
    expect(preventDefault).toHaveBeenCalled();
  });

  it("uses the error style only for a real failure", () => {
    trackSearch(ctx());
    applySearchResult({ media_id: 7, outcome: "error", reason: "boom" });
    expect(toast.error).toHaveBeenCalledTimes(1);
  });

  it("ignores results for items it is not tracking", () => {
    applySearchResult({ media_id: 99, outcome: "no_match" });
    expect(toast.info).not.toHaveBeenCalled();
  });

  it("becomes 'still searching' after two minutes without an outcome", () => {
    trackSearch(ctx());
    vi.advanceTimersByTime(STILL_SEARCHING_MS + 1);
    expect(toast.info).toHaveBeenCalledWith(
      "medias.searchToast.stillSearching",
      expect.objectContaining({ id: "search-7" }),
    );
    // A late outcome still lands in the same toast.
    applySearchResult({ media_id: 7, outcome: "no_match" });
    expect(toast.info).toHaveBeenCalledTimes(2);
  });

  it("lets a later season's grab upgrade a miss, but not the reverse", () => {
    trackSearch(ctx({ isShow: true }));
    applySearchResult({ media_id: 7, season: 1, outcome: "no_match" });
    applySearchResult({
      media_id: 7,
      season: 2,
      outcome: "grabbed",
      release: { title: "X", resolution: null, source: null, size_bytes: null },
    });
    expect(toast.success).toHaveBeenCalledTimes(1);
    applySearchResult({ media_id: 7, season: 3, outcome: "no_match" });
    expect(toast.info).toHaveBeenCalledTimes(1);
  });

  it("keeps hiding the grab popup through a short grace, then stops", () => {
    trackSearch(ctx());
    expect(isGrabPopupSuppressed(7)).toBe(true);
    applySearchResult({ media_id: 7, outcome: "grabbed" });
    expect(isGrabPopupSuppressed(7)).toBe(true);
    vi.advanceTimersByTime(30_000);
    expect(isGrabPopupSuppressed(7)).toBe(false);
  });
});
