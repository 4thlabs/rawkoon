import { useState } from "react";
import type { EpisodeSearchCtx } from "./LibraryItemSearchTab";

/** Episode, season and upgrade state behind the Releases tab, and the header's ways into it. */
export function useReleaseSearchContext(openReleases: () => void) {
  const [episodeSearchCtx, setEpisodeSearchCtx] =
    useState<EpisodeSearchCtx | null>(null);
  const [seasonSearchCtx, setSeasonSearchCtx] = useState<number | null>(null);
  const [upgradeSearchMode, setUpgradeSearchMode] = useState(false);

  return {
    episodeSearchCtx,
    seasonSearchCtx,
    upgradeSearchMode,
    setEpisodeSearchCtx,
    setSeasonSearchCtx,
    setUpgradeSearchMode,
    // A leftover episode or season would aim the grab at the wrong target.
    chooseRelease() {
      setEpisodeSearchCtx(null);
      setSeasonSearchCtx(null);
      openReleases();
    },
    searchUpgrade() {
      setEpisodeSearchCtx(null);
      setSeasonSearchCtx(null);
      setUpgradeSearchMode(true);
      openReleases();
    },
  };
}
