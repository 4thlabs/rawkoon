import { statfs } from "node:fs/promises";
import { prisma } from "@rawkoon/api/db";

export const SPACE_REFUSAL_PREFIX = "Not enough free space";

const GB = 1024 ** 3;

/**
 * Refuse a grab that would leave less than the configured free space on the
 * volume the download lands on. Returns a reason when refused, null otherwise.
 * Monitoring failures (no path, statfs error) never block a grab.
 */
export async function checkFreeSpaceForGrab(opts: {
  mediaType: string;
  sizeBytes: number | null | undefined;
}): Promise<string | null> {
  const size = opts.sizeBytes;
  if (!size || !Number.isFinite(size) || size <= 0) return null;

  try {
    const settings = await prisma.mediaSettings.findUnique({
      where: { id: 1 },
    });
    const minFreeGb = settings?.minFreeSpaceGb ?? 0;
    if (!settings || minFreeGb <= 0) return null;

    // Bytes land in the downloads dir first; the library path is the fallback
    // for setups that download straight into the library volume.
    const libraryPath =
      opts.mediaType === "movie"
        ? settings.moviesLibraryPath
        : settings.showsLibraryPath;
    const path = settings.downloadsPath?.trim() || libraryPath?.trim();
    if (!path) return null;

    const fs = await statfs(path);
    const freeBytes = Number(fs.bavail) * Number(fs.bsize);
    if (freeBytes - size >= minFreeGb * GB) return null;

    return `${SPACE_REFUSAL_PREFIX}: needs ${fmtGb(size)} GB, ${fmtGb(freeBytes)} GB free, keeping ${minFreeGb} GB`;
  } catch (e) {
    console.warn("[mediaGrabber] free-space check failed, allowing grab:", e);
    return null;
  }
}

function fmtGb(bytes: number): string {
  return (bytes / GB).toFixed(1);
}
