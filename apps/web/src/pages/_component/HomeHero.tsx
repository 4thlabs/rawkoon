import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { AnimatePresence, motion } from "motion/react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import type {
  DashboardHeroItem,
  AddToLibraryResponse,
  DashboardHeroSource,
  TmdbMediaSearchItem,
} from "@rawkoon/shared/types";
import {
  AddOnlyMenu,
  AddSearchCaption,
} from "@/features/medias/components/AddSearchControls";
import { useAddToLibrary } from "@/features/medias/hooks/useAddToLibrary";
import { useSearchOnAddEnabled } from "@/features/medias/hooks/useSearchOnAddEnabled";
import { addToastMessage } from "@/features/medias/lib/addToastMessage";
import { useCurrentUser } from "@/lib/auth/useAuth";
import { useCreateRequest } from "@/pages/requests/_hooks/useRequests";
import { formatRelativeTime } from "@/lib/utils/relativeTime";
import { ExploreCardDetailDialog } from "@/pages/medias/_component/ExploreCardDetailDialog";
import { GreetingCard } from "@/pages/_component/GreetingCard";
import {
  HERO_ROTATE_SECONDS,
  clampHeroIndex,
  nextHeroIndex,
} from "@/pages/_component/heroRotation";
import { useDashboardHero } from "@/pages/_component/useDashboardHero";

const KICKER_KEY: Record<DashboardHeroSource, string> = {
  arrivals: "dashboard.hero.kicker.arrivals",
  for_you: "dashboard.hero.kicker.forYou",
  trending: "dashboard.hero.kicker.trending",
};

const buttonBase =
  "inline-flex h-10 items-center justify-center rounded-full px-5 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-300";

function usePrefersReducedMotion(): boolean {
  const query = "(prefers-reduced-motion: reduce)";
  const read = () =>
    typeof window !== "undefined" &&
    typeof window.matchMedia === "function" &&
    window.matchMedia(query).matches;
  const [reduced, setReduced] = useState(read);
  useEffect(() => {
    if (typeof window.matchMedia !== "function") return;
    const mql = window.matchMedia(query);
    const onChange = () => setReduced(mql.matches);
    mql.addEventListener?.("change", onChange);
    return () => mql.removeEventListener?.("change", onChange);
  }, []);
  return reduced;
}

/** `S01E04` when both are known (a season pack has no single episode). */
function episodeCode(item: DashboardHeroItem): string | null {
  if (item.season_number == null || item.episode_number == null) return null;
  const pad = (n: number) => String(n).padStart(2, "0");
  return `S${pad(item.season_number)}E${pad(item.episode_number)}`;
}

function toSearchItem(item: DashboardHeroItem): TmdbMediaSearchItem {
  return {
    id: `${item.media_type}-${item.tmdb_id}`,
    tmdb_id: item.tmdb_id,
    media_type: item.media_type,
    title: item.title,
    release_year: item.year,
    poster_url: item.poster_url,
    overview: item.overview,
    vote_average: null,
    already_exists: false,
    can_add: true,
    source_id: null,
    library_id: item.library_id,
  };
}

function HeroCarousel({
  items,
  userName,
}: {
  items: DashboardHeroItem[];
  userName: string;
}) {
  const { t, i18n } = useTranslation("common");
  const reduced = usePrefersReducedMotion();
  const [stored, setIndex] = useState(0);
  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);
  const paused = hovered || focused;
  const [detail, setDetail] = useState<TmdbMediaSearchItem | null>(null);
  const [added, setAdded] = useState<Set<number>>(() => new Set());
  const addToLibrary = useAddToLibrary();
  const searchOnAddEnabled = useSearchOnAddEnabled();
  const createRequest = useCreateRequest();
  const { data: user } = useCurrentUser();

  const count = items.length;
  const index = clampHeroIndex(stored, count);
  const item = items[index];
  // Each slide says why it is here: arrivals first, then deck picks.
  const source = item.source;

  useEffect(() => {
    if (reduced || paused || count < 2) return;
    const id = setTimeout(
      () => setIndex(nextHeroIndex(index, count)),
      HERO_ROTATE_SECONDS * 1000,
    );
    return () => clearTimeout(id);
  }, [index, count, paused, reduced]);

  const showSearchHint = searchOnAddEnabled && user?.is_admin === true;

  const relative =
    source === "arrivals"
      ? formatRelativeTime(item.arrived_at, i18n.language)
      : null;
  const meta = [
    relative ? t("dashboard.hero.arrived", { relative }) : null,
    episodeCode(item),
    source === "arrivals" ? null : item.year,
  ].filter((part) => part != null && part !== "");

  const onAdd = (searchOnAdd?: boolean) => {
    const tmdbId = item.tmdb_id;
    const type = item.media_type === "tv" ? "show" : "movie";
    const callbacks = {
      onSuccess: () => setAdded((prev) => new Set(prev).add(tmdbId)),
      onError: () =>
        toast.error(t("dashboard.hero.addFailed", { title: item.title })),
    };
    const addCallbacks = {
      ...callbacks,
      onSuccess: (response: AddToLibraryResponse) => {
        callbacks.onSuccess();
        toast.success(addToastMessage(t, item.title, response, i18n.language));
      },
    };
    // Adding to the library is admin-only; everyone else files a request, as on iOS.
    if (user?.is_admin) {
      addToLibrary.mutate(
        {
          tmdb_id: tmdbId,
          type,
          ...(searchOnAdd === false ? { search_on_add: false } : {}),
        },
        addCallbacks,
      );
    } else {
      createRequest.mutate(
        {
          tmdb_id: tmdbId,
          type,
          title: item.title,
          poster_url: item.poster_url,
          year: item.year,
        },
        callbacks,
      );
    }
  };

  return (
    <section
      data-testid="home-hero"
      className="relative isolate -mx-4 -mt-8 min-h-[26rem] overflow-hidden bg-neutral-950 sm:-mx-6 sm:min-h-[30rem] lg:-mx-8"
      // Mouse only: a tap's emulated hover would otherwise pause until the next tap elsewhere.
      onPointerEnter={(e) => e.pointerType === "mouse" && setHovered(true)}
      onPointerLeave={(e) => e.pointerType === "mouse" && setHovered(false)}
      onFocus={() => setFocused(true)}
      onBlur={(e) =>
        !e.currentTarget.contains(e.relatedTarget as Node | null) &&
        setFocused(false)
      }
    >
      <AnimatePresence>
        <motion.div
          key={`${item.tmdb_id}-${item.media_type}`}
          className="absolute inset-0 -z-20"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.9, ease: "easeInOut" }}
        >
          <motion.img
            src={item.backdrop_url}
            alt=""
            className="h-full w-full object-cover"
            initial={{ scale: 1.04 }}
            animate={reduced ? { scale: 1.04 } : { scale: 1.14 }}
            transition={{
              duration: 18,
              ease: "linear",
              repeat: reduced ? 0 : Infinity,
              repeatType: "reverse",
            }}
          />
        </motion.div>
      </AnimatePresence>
      <div className="absolute inset-0 -z-10 bg-gradient-to-t from-neutral-950 via-neutral-950/55 to-transparent" />
      <div className="absolute inset-0 -z-10 bg-gradient-to-r from-neutral-950/85 via-neutral-950/35 to-transparent" />

      <div className="flex min-h-[26rem] flex-col justify-end gap-5 px-4 pb-6 pt-16 sm:min-h-[30rem] sm:px-6 lg:px-8">
        <GreetingCard userName={userName} onHero />
        <motion.div
          key={`${item.tmdb_id}-${item.media_type}-copy`}
          className="max-w-2xl"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6 }}
        >
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-primary-300">
            {t(KICKER_KEY[source])}
          </p>
          <h2 className="mt-1 line-clamp-2 break-words text-3xl font-bold tracking-tight text-white drop-shadow sm:text-5xl">
            {item.title}
          </h2>
          {meta.length > 0 && (
            <p className="mt-2 text-sm text-neutral-300">{meta.join(" · ")}</p>
          )}
          <div className="mt-4 flex flex-wrap items-center gap-3">
            {source !== "arrivals" &&
              (added.has(item.tmdb_id) ? (
                <span
                  className={`${buttonBase} bg-white/15 text-white/80`}
                  aria-live="polite"
                >
                  {user?.is_admin
                    ? t("dashboard.hero.added")
                    : t("requests.requested")}
                </span>
              ) : (
                <div className="flex flex-col items-start gap-1">
                  <div className="inline-flex items-stretch">
                    <button
                      type="button"
                      onClick={() => onAdd()}
                      disabled={
                        addToLibrary.isPending || createRequest.isPending
                      }
                      className={`${buttonBase} bg-primary-500 text-white hover:bg-primary-400 disabled:opacity-60 ${showSearchHint ? "rounded-r-none pr-4" : ""}`}
                    >
                      {t("dashboard.hero.add")}
                    </button>
                    {showSearchHint && (
                      <AddOnlyMenu
                        onAddOnly={() => onAdd(false)}
                        disabled={addToLibrary.isPending}
                        className="h-10 rounded-r-full border-l border-white/25 bg-primary-500 px-2.5 text-white hover:bg-primary-400"
                      />
                    )}
                  </div>
                  {showSearchHint && (
                    <AddSearchCaption className="text-neutral-300" />
                  )}
                </div>
              ))}
            {item.library_id != null ? (
              <Link
                to="/library/$libraryId"
                params={{ libraryId: String(item.library_id) }}
                className={`${buttonBase} ${source === "arrivals" ? "bg-primary-500 text-white hover:bg-primary-400" : "bg-white/15 text-white hover:bg-white/25"}`}
              >
                {t("dashboard.hero.details")}
              </Link>
            ) : (
              <button
                type="button"
                onClick={() => setDetail(toSearchItem(item))}
                className={`${buttonBase} bg-white/15 text-white hover:bg-white/25`}
              >
                {t("dashboard.hero.details")}
              </button>
            )}
          </div>
        </motion.div>

        {count > 1 && (
          <div className="flex items-center gap-1">
            {items.map((it, i) => (
              <button
                key={`${it.tmdb_id}-${it.media_type}`}
                type="button"
                aria-label={t("dashboard.hero.goTo", { title: it.title })}
                aria-current={i === index}
                onClick={() => setIndex(i)}
                className="flex h-6 w-6 items-center justify-center"
              >
                <span
                  className={`h-1.5 rounded-full transition-all ${i === index ? "w-6 bg-primary-300" : "w-1.5 bg-white/40"}`}
                />
              </button>
            ))}
          </div>
        )}
      </div>

      {detail && (
        <ExploreCardDetailDialog
          item={detail}
          isOpen
          onClose={() => setDetail(null)}
          onAdded={() => setDetail(null)}
        />
      )}
    </section>
  );
}

/**
 * Home's opening film: a backdrop deck with the greeting overlaid. With no
 * items (empty, loading or failed) it renders the plain greeting instead.
 */
export function HomeHero({ userName }: { userName: string }) {
  const { data } = useDashboardHero();
  const items = data?.items ?? [];
  if (!data || items.length === 0) return <GreetingCard userName={userName} />;
  return <HeroCarousel items={items} userName={userName} />;
}
