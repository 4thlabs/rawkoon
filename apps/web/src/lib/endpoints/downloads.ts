export const DOWNLOADS_ENDPOINTS = {
  SPEED: "/api/dashboard/downloads/speed",
  SEEDING: "/api/downloads/seeding",
  RELEASE: (hash: string) => `/api/downloads/seeding/${hash}/release`,
  ORPHANS: "/api/downloads/orphans",
  REMOVE_ORPHANS: "/api/downloads/orphans/remove",
  SEED_RULES: "/api/downloads/seed-rules",
  SEED_RULE: (indexer: string) =>
    `/api/downloads/seed-rules/${encodeURIComponent(indexer)}`,
  ACTIVE: "/api/dashboard/downloads/active",
  PENDING_RELEASES: "/api/downloads/pending-releases",
  GRAB_PENDING_NOW: "/api/downloads/pending-releases/grab-now",
  JANITOR_STATS: "/api/downloads/janitor-stats",
} as const;
