export interface DownloadClientSpeed {
  enabled: boolean;
  connected: boolean;
  dl_speed: number;
  ul_speed: number;
}

/** A target whose automatic grab is held back by its quality profile's delay. */
export interface PendingReleaseItem {
  target_key: string;
  media_id: number;
  media_title: string;
  season: number | null;
  episode: number | null;
  /** Highest-ranked candidate collected so far. */
  release_title: string;
  candidate_count: number;
  /** ISO time the earliest candidate's delay window ends. */
  grab_after: string;
}

export interface PendingReleasesResponse {
  items: PendingReleaseItem[];
}
