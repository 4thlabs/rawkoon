import type { TFunction } from "i18next";
import type { AddToLibraryResponse } from "@rawkoon/shared/types";

/** The date is a calendar day, so format it in UTC to avoid shifting it a day. */
function formatReleaseDay(ymd: string, language: string): string {
  const date = new Date(`${ymd}T00:00:00Z`);
  if (Number.isNaN(date.getTime())) return ymd;
  return new Intl.DateTimeFormat(language, {
    dateStyle: "medium",
    timeZone: "UTC",
  }).format(date);
}

/** What the add toast says about the search the server queued (or didn't). */
export function addToastMessage(
  t: TFunction,
  title: string,
  response: Pick<
    AddToLibraryResponse,
    "search_queued" | "search_skipped_reason" | "digital_release_date"
  >,
  language: string,
): string {
  if (response.search_queued) return t("medias.addToast.searching", { title });
  if (response.search_skipped_reason === "not_released") {
    return response.digital_release_date
      ? t("medias.addToast.notReleased", {
          title,
          date: formatReleaseDay(response.digital_release_date, language),
        })
      : t("medias.addToast.notReleasedNoDate", { title });
  }
  return t("medias.addSuccess", { title });
}
