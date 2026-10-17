import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import type { TitleTranslation } from "@rawkoon/shared/types";
import {
  buildTitleOptions,
  type LabeledTitleOption,
} from "@/lib/utils/interactive-search";
import { languageDisplayName } from "@/lib/utils/languageDisplayName";

/** Library titles are persisted in English (the API's TMDB_LANGUAGE_LIBRARY_PERSISTENCE), whatever the UI language. */
const LIBRARY_TITLE_LANGUAGE = "en";

/** Per-language search titles, labelled in the UI language, for the picker. */
export function useLibraryTitleOptions({
  title,
  originalTitle,
  originalLanguage,
  translations,
  suffix,
}: {
  title: string;
  originalTitle: string | null;
  originalLanguage: string | null;
  translations: TitleTranslation[];
  suffix?: string;
}): LabeledTitleOption[] {
  const { t, i18n } = useTranslation("common");
  return useMemo(() => {
    const originalTag = t("medias.interactive.originalTag", "original");
    return buildTitleOptions({
      localized: title,
      localizedLanguage: LIBRARY_TITLE_LANGUAGE,
      original: originalTitle,
      originalLanguage,
      translations,
      suffix,
    }).map((option) => {
      const name = languageDisplayName(option.languageCode, i18n.language);
      return {
        ...option,
        label: option.isOriginal ? `${name} (${originalTag})` : name,
      };
    });
  }, [
    title,
    originalTitle,
    originalLanguage,
    translations,
    suffix,
    i18n.language,
    t,
  ]);
}
