import { useCallback } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import type {
  AddToLibraryResponse,
  TmdbMediaSearchItem,
} from "@rawkoon/shared/types";
import { useAddToLibrary } from "./useAddToLibrary";
import { useLiveSearchToast } from "./useLiveSearchToast";

type AddableTitle = Pick<
  TmdbMediaSearchItem,
  "tmdb_id" | "media_type" | "title" | "can_add"
>;

/** Adds a TMDB title to the library and toasts the outcome; null when it was skipped or failed. */
export function useAddTitle() {
  const { t } = useTranslation("common");
  const { mutateAsync, isPending } = useAddToLibrary();
  const liveSearchToast = useLiveSearchToast();

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
        if (!options?.silent) liveSearchToast.announceAdd(response, item.title);
        return response;
      } catch {
        toast.error(t("medias.addFailed"));
        return null;
      }
    },
    [isPending, mutateAsync, t, liveSearchToast],
  );

  return { addTitle, isAdding: isPending };
}
