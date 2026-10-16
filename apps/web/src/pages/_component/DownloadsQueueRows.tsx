import { useTranslation } from "react-i18next";
import { Link } from "@tanstack/react-router";
import { Clock, Film, Loader2 } from "lucide-react";
import type {
  ActiveDownloadItem,
  PendingReleaseItem,
} from "@rawkoon/shared/types";
import { formatEtaSeconds } from "@rawkoon/shared/utils";
import { cn } from "@/lib/utils";
import { formatSpeed } from "@/lib/utils/format";

const STALLED_STATES = new Set(["stalled", "paused", "error"]);

function pad(n: number): string {
  return String(n).padStart(2, "0");
}

/** `S01E02` for an episode, `S01` for a season pack, empty for a movie. */
function episodeSuffix(season: number | null, episode: number | null): string {
  if (season == null) return "";
  return ` S${pad(season)}${episode != null ? `E${pad(episode)}` : ""}`;
}

function Thumb({ posterUrl }: { posterUrl: string | null }) {
  return (
    <div className="flex h-[54px] w-9 shrink-0 items-center justify-center overflow-hidden rounded-md bg-neutral-800">
      {posterUrl ? (
        <img
          decoding="async"
          loading="lazy"
          src={posterUrl}
          alt=""
          className="h-full w-full object-cover"
        />
      ) : (
        <Film className="h-4 w-4 text-neutral-500" aria-hidden />
      )}
    </div>
  );
}

function TitleLink({ mediaId, title }: { mediaId: number; title: string }) {
  return (
    <Link
      to="/library/$libraryId"
      params={{ libraryId: String(mediaId) }}
      className="block truncate text-sm font-medium text-neutral-100 transition-colors hover:text-neutral-300"
    >
      {title}
    </Link>
  );
}

export function ActiveDownloadRow({ item }: { item: ActiveDownloadItem }) {
  const { t } = useTranslation("common");
  const percent = Math.min(100, Math.max(0, Math.floor(item.progress * 100)));
  const stalled = STALLED_STATES.has(item.state);
  const eta = formatEtaSeconds(item.eta_seconds);

  return (
    <li className="flex min-w-0 gap-3">
      <Thumb posterUrl={item.poster_url} />
      <div className="min-w-0 flex-1">
        <TitleLink
          mediaId={item.media_id}
          title={`${item.media_title}${episodeSuffix(item.season, item.episode)}`}
        />
        <p className="truncate text-[11px] text-neutral-500">
          {item.release_title}
        </p>
        <div
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={percent}
          aria-label={item.media_title}
          className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-neutral-800"
        >
          <div
            className={cn(
              "h-full rounded-full transition-[width] duration-700 ease-out motion-reduce:transition-none",
              stalled ? "bg-amber-400" : "bg-sky-400",
            )}
            style={{ width: `${percent}%` }}
          />
        </div>
        <p className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px] tabular-nums text-neutral-400">
          <span className="font-semibold text-neutral-200">{percent}%</span>
          {stalled ? (
            <span className="text-amber-400">
              {t(`dashboard.home.downloadState.${item.state}`)}
            </span>
          ) : (
            <>
              <span>{formatSpeed(item.download_speed)}</span>
              {eta ? (
                <span>{t("dashboard.home.etaLeft", { time: eta })}</span>
              ) : null}
            </>
          )}
        </p>
      </div>
    </li>
  );
}

export function PendingReleaseRow({
  item,
  now,
  busy,
  onGrabNow,
}: {
  item: PendingReleaseItem;
  now: number;
  busy: boolean;
  onGrabNow: (targetKey: string) => void;
}) {
  const { t } = useTranslation("common");
  const grabAt = new Date(item.grab_after);
  const secondsLeft = Math.round((grabAt.getTime() - now) / 1000);
  const eta = secondsLeft > 0 ? formatEtaSeconds(secondsLeft) : null;

  return (
    <li className="flex min-w-0 gap-3">
      <Thumb posterUrl={item.poster_url} />
      <div className="min-w-0 flex-1">
        <TitleLink
          mediaId={item.media_id}
          title={`${item.media_title}${episodeSuffix(item.season, item.episode)}`}
        />
        <p className="truncate text-[11px] text-neutral-500">
          {item.release_title}
        </p>
        <div className="mt-1 flex items-center justify-between gap-2">
          <p
            className="flex min-w-0 items-center gap-1 text-[11px] tabular-nums text-neutral-400"
            title={grabAt.toLocaleString()}
          >
            <Clock size={11} className="shrink-0" aria-hidden />
            <span className="truncate">
              {eta
                ? t("dashboard.home.pendingGrabIn", { time: eta })
                : t("dashboard.home.pendingGrabDue")}
            </span>
          </p>
          <button
            type="button"
            disabled={busy}
            onClick={() => onGrabNow(item.target_key)}
            className="inline-flex shrink-0 items-center gap-1 rounded-md border border-primary-600/60 bg-primary-600/15 px-2 py-1 text-[11px] font-semibold text-primary-400 hover:bg-primary-600/25 disabled:opacity-50"
          >
            {busy ? <Loader2 size={11} className="animate-spin" /> : null}
            {t("dashboard.home.grabNow")}
          </button>
        </div>
      </div>
    </li>
  );
}
