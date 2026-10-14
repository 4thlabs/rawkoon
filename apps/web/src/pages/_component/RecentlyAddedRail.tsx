import { useTranslation } from "react-i18next";
import { landedEpisodeCode } from "@rawkoon/shared/utils";
import {
  useFreshLanded,
  useMinuteClock,
} from "@/features/medias/hooks/useLandedArrivals";
import { PosterRail } from "@/pages/_component/PosterRail";
import { useRecentlyAdded } from "@/pages/_component/useRecentlyAdded";

/**
 * "Recently added" poster rail backed by the user's library, ordered by
 * `added_at` desc. Fresh arrivals pin to the front with a "Just landed" stamp.
 * Wraps the shared {@link PosterRail}.
 */
export function RecentlyAddedRail() {
  const { t } = useTranslation("common");
  const { data, isLoading } = useRecentlyAdded();
  const landed = useFreshLanded(useMinuteClock());

  const landedIds = new Set(landed.map((a) => a.mediaId));
  const items = [
    ...landed.map((a) => ({
      id: `landed-${a.mediaId}`,
      title: a.title,
      posterUrl: a.posterUrl,
      libraryId: a.mediaId,
      badge: t("dashboard.landed.stamp"),
      animateIn: true,
      meta: landedEpisodeCode(a.season, a.episode) || undefined,
    })),
    ...(data ?? [])
      .filter((m) => !landedIds.has(m.id))
      .map((m) => ({
        id: String(m.id),
        title: m.title,
        posterUrl: m.poster_url,
        libraryId: m.id,
      })),
  ];

  return (
    <PosterRail
      title={t("dashboard.home.recentlyAdded")}
      items={items}
      isLoading={isLoading}
      emptyLabel={t("dashboard.home.recentlyAddedEmpty")}
    />
  );
}
