import { useUrlState } from "@/lib/app/useUrlState";

export const DISCOVER_DEFAULTS = {
  type: "movie" as "movie" | "tv",
  provider: null as number | null,
  genre: null as number | null,
  sort: "popularity.desc" as string,
  page: 1 as number,
  lang: null as string | null,
  q: null as string | null,
  hide_owned: false as boolean,
};

export type DiscoverPageSearchParams = Partial<typeof DISCOVER_DEFAULTS>;

export function useDiscoverPageState(searchParams: DiscoverPageSearchParams) {
  const { state, setState } = useUrlState(
    "/find/",
    searchParams,
    DISCOVER_DEFAULTS,
  );

  return { state, setState };
}
