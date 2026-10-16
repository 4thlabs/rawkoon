import { describe, it, expect, vi } from "vitest";
import { act, renderHook } from "@testing-library/react";
import { useReleaseSearchContext } from "./useReleaseSearchContext";

function withContext() {
  const openReleases = vi.fn();
  const hook = renderHook(() => useReleaseSearchContext(openReleases));
  act(() => {
    hook.result.current.setEpisodeSearchCtx({
      id: 1,
      season: 1,
      episode: 2,
      title: null,
    });
    hook.result.current.setSeasonSearchCtx(1);
  });
  return { hook, openReleases };
}

describe("useReleaseSearchContext", () => {
  it("clears a leftover episode and season search when choosing a release", () => {
    const { hook, openReleases } = withContext();
    act(() => hook.result.current.chooseRelease());
    expect(hook.result.current.episodeSearchCtx).toBeNull();
    expect(hook.result.current.seasonSearchCtx).toBeNull();
    expect(hook.result.current.upgradeSearchMode).toBe(false);
    expect(openReleases).toHaveBeenCalledOnce();
  });

  it("clears them too before an upgrade search, and turns upgrade mode on", () => {
    const { hook, openReleases } = withContext();
    act(() => hook.result.current.searchUpgrade());
    expect(hook.result.current.episodeSearchCtx).toBeNull();
    expect(hook.result.current.seasonSearchCtx).toBeNull();
    expect(hook.result.current.upgradeSearchMode).toBe(true);
    expect(openReleases).toHaveBeenCalledOnce();
  });
});
