import { createFileRoute, redirect } from "@tanstack/react-router";
import { getCurrentUser } from "@/lib/auth";
import { FindPage } from "@/pages/find/_component/FindPage";
import { readFindMode } from "@/pages/find/_component/findMode";

type FindSearchParams = {
  type?: "movie" | "tv";
  provider?: number;
  genre?: number;
  sort?: string;
  page?: number;
  lang?: string;
  q?: string;
  hide_owned?: boolean;
};

const parseOptionalInt = (val: unknown): number | undefined =>
  typeof val === "number"
    ? val
    : typeof val === "string" && val
      ? Number(val) || undefined
      : undefined;

export const Route = createFileRoute("/find/")({
  validateSearch: (search: Record<string, unknown>): FindSearchParams => ({
    type:
      search.type === "movie" || search.type === "tv" ? search.type : undefined,
    provider: parseOptionalInt(search.provider),
    genre: parseOptionalInt(search.genre),
    sort:
      typeof search.sort === "string" && search.sort ? search.sort : undefined,
    page: parseOptionalInt(search.page),
    lang:
      typeof search.lang === "string" && search.lang ? search.lang : undefined,
    q: typeof search.q === "string" && search.q ? search.q : undefined,
    hide_owned:
      search.hide_owned === true || search.hide_owned === "true"
        ? true
        : undefined,
  }),
  beforeLoad: async ({ search }) => {
    try {
      const user = await getCurrentUser();
      if (!user) throw redirect({ to: "/login" });
      // Nav and shelf links land here without params, so reopen the session's last mode.
      if (
        readFindMode() === "swipe" &&
        Object.values(search).every((v) => v === undefined)
      ) {
        throw redirect({ to: "/find/swipe", replace: true });
      }
      return { user };
    } catch (e: unknown) {
      if ((e as { status?: number })?.status === 429) return { user: null };
      throw e;
    }
  },
  component: FindPage,
});
