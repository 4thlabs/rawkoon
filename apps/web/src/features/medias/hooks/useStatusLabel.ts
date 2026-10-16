import { useTranslation } from "react-i18next";
import type { LibraryMediaStatus } from "@rawkoon/shared/types";
import { useDownloadPercent } from "./useActiveDownloads";

/** The status label, with the live percent appended while a grab is in flight. */
export function useStatusLabel(
  item: { id: number; status: LibraryMediaStatus },
  labelKey: string,
): string {
  const { t } = useTranslation("common");
  const percent = useDownloadPercent(
    item.id,
    item.status === "downloading" || item.status === "upgrading",
  );
  const label = t(labelKey);
  return percent == null
    ? label
    : t("medias.library.itemStatusPercent", { label, percent });
}
