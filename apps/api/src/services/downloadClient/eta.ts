/** Seconds left at the current speed; null when the speed is zero or the size unknown. */
export function estimateEtaSeconds(torrent: {
  progress: number;
  sizeBytes: number;
  dlSpeed: number;
}): number | null {
  if (torrent.dlSpeed <= 0 || torrent.sizeBytes <= 0) return null;
  const remaining = Math.max(0, 1 - torrent.progress) * torrent.sizeBytes;
  return Math.round(remaining / torrent.dlSpeed);
}
