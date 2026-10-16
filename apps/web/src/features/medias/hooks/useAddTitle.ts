import { useCallback } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import type {
  AddToLibraryResponse,
  TmdbMediaSearchItem,
} from "@rawkoon/shared/types";
import { useAddToLibrary } from "./useAddToLibrary";
import { addToastMessage } from "../lib/addToastMessage";

type AddableTitle = Pick<
  TmdbMediaSearchItem,
  "tmdb_id" | "media_type" | "title" | "can_add"
>;

/** Adds a TMDB title to the library and toasts the outcome; null when it was skipped or failed. */
export function useAddTitle() {
  const { t, i18n } = useTranslation("common");
  const { mutateAsync, isPending } = useAddToLibrary();

  const addTitle = useCallback(
    async (
      item: AddableTitle,
      options?: { searchOnAdd?: false; silent?: boolean },
    ): Promise<AddToLibraryResponse | null> => {
      if (isPending || !item.can_add) return null;
      try {
        const response = await mutateAsync({
          tmdb_id: item.tmdb_id,
          type: item.media_type === "tv" ? "show" : "movie",
          ...(options?.searchOnAdd === false ? { search_on_add: false } : {}),
        });
        if (!options?.silent) {
          toast.success(
            addToastMessage(t, item.title, response, i18n.language),
          );
        }
        return response;
      } catch {
        toast.error(t("medias.addFailed"));
        return null;
      }
    },
    [isPending, mutateAsync, t, i18n.language],
  );

  return { addTitle, isAdding: isPending };
}
