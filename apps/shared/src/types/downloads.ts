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
  poster_url: string | null;
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

/** One in-flight grab, joined to its library title and the client's live numbers. */
export interface ActiveDownloadItem {
  /** download_history id; matches `DownloadProgressItem.id` in the live SSE feed. */
  id: number;
  media_id: number;
  media_title: string;
  media_type: "movie" | "show";
  poster_url: string | null;
  season: number | null;
  episode: number | null;
  release_title: string;
  /** 0..1 */
  progress: number;
  state: string;
  /** bytes/s */
  download_speed: number;
  eta_seconds: number | null;
}

export interface ActiveDownloadsResponse {
  enabled: boolean;
  connected: boolean;
  items: ActiveDownloadItem[];
}

export interface GrabPendingReleaseResponse {
  grabbed: boolean;
}
