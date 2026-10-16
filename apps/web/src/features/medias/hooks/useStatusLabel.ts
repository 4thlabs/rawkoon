import { useTranslation } from "react-i18next";
import type { LibraryMediaStatus } from "@rawkoon/shared/types";
import { useDownloadProgress } from "./useActiveDownloads";

/** The status label, with the live percent (or the episode count for a show) while a grab is in flight. */
export function useStatusLabel(
  item: { id: number; status: LibraryMediaStatus },
  labelKey: string,
): string {
  const { t } = useTranslation("common");
  const progress = useDownloadProgress(
    item.id,
    item.status === "downloading" || item.status === "upgrading",
  );
  const label = t(labelKey);
  if (!progress) return label;
  if (progress.count > 1)
    return t("medias.library.itemStatusEpisodes", {
      label,
      count: progress.count,
    });
  return t("medias.library.itemStatusPercent", {
    label,
    percent: progress.percent,
  });
}
