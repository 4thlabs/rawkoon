import { createFileRoute, redirect } from "@tanstack/react-router";
import { parseItemTab } from "@/features/medias/lib/itemPageActions";
import { getCurrentUser } from "@/lib/auth";
import {
  LibraryItemPage,
  type LibraryItemSearchParams,
} from "@/pages/medias/_component/LibraryItemPage";

export const Route = createFileRoute("/library/$libraryId")({
  validateSearch: (
    search: Record<string, unknown>,
  ): LibraryItemSearchParams => ({
    tab: parseItemTab(search.tab),
    season:
      typeof search.season === "string" || typeof search.season === "number"
        ? Number(search.season)
        : undefined,
    episode:
      typeof search.episode === "string" || typeof search.episode === "number"
        ? Number(search.episode)
        : undefined,
  }),
  beforeLoad: async () => {
    try {
      const user = await getCurrentUser();
      if (!user) throw redirect({ to: "/login" });
      return { user };
    } catch (e: unknown) {
      if ((e as { status?: number })?.status === 429) return { user: null };
      throw e;
    }
  },
  component: LibraryItemPage,
});
