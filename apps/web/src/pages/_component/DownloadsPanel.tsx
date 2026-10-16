import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { ArrowDown, Download } from "lucide-react";

import { useActiveDownloads } from "@/features/medias/hooks/useActiveDownloads";
import { useDownloadsSpeed } from "@/pages/_component/useDownloadsSpeed";
import {
  useGrabPendingNow,
  usePendingReleases,
} from "@/pages/_component/usePendingReleases";
import {
  ActiveDownloadRow,
  PendingReleaseRow,
} from "@/pages/_component/DownloadsQueueRows";
import { formatSpeed } from "@/lib/utils/format";
import {
  Kicker,
  WidgetHeader,
  WidgetShell,
} from "@/pages/_component/widgetPrimitives";

const ACTIVE_SHOWN = 5;
const PENDING_SHOWN = 3;
/** Relative "grabs in" labels only need to move about once a minute. */
const CLOCK_TICK_MS = 30_000;

function useNow(): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), CLOCK_TICK_MS);
    return () => clearInterval(id);
  }, []);
  return now;
}

export function DownloadsPanel() {
  const { t } = useTranslation("common");
  const speed = useDownloadsSpeed();
  const active = useActiveDownloads();
  const pending = usePendingReleases().data?.items ?? [];
  const grabNow = useGrabPendingNow();
  const now = useNow();

  const items = active.data?.items ?? [];
  const isLoading = speed.isLoading || active.isLoading;
  const enabled = speed.data?.enabled ?? active.data?.enabled ?? false;
  const connected = speed.data?.connected ?? active.data?.connected ?? false;
  const empty = items.length === 0 && pending.length === 0;

  return (
    <WidgetShell>
      <WidgetHeader
        icon={Download}
        title={t("dashboard.home.downloadsTitle")}
        right={
          enabled && connected ? (
            <span
              className="flex shrink-0 items-center gap-1 font-mono text-sm font-semibold tabular-nums text-sky-400"
              title={t("dashboard.home.transfer")}
            >
              <ArrowDown size={13} aria-hidden />
              {formatSpeed(speed.data?.dl_speed ?? 0)}
            </span>
          ) : undefined
        }
      />

      <div className="space-y-4 px-4 py-3">
        {isLoading && (
          <div className="space-y-3">
            {[0, 1].map((i) => (
              <div key={i} className="flex gap-3">
                <div className="h-[54px] w-9 shrink-0 animate-pulse rounded-md bg-neutral-800" />
                <div className="flex-1 space-y-2">
                  <div className="h-3 w-2/3 animate-pulse rounded bg-neutral-800" />
                  <div className="h-2 w-full animate-pulse rounded bg-neutral-800" />
                  <div className="h-2 w-1/3 animate-pulse rounded bg-neutral-800" />
                </div>
              </div>
            ))}
          </div>
        )}

        {!isLoading && !enabled && (
          <p className="py-2 text-center text-sm text-neutral-400">
            {t("dashboard.home.downloadClientNotConfigured")}
          </p>
        )}

        {!isLoading && enabled && !connected && (
          <p className="py-2 text-center text-sm text-amber-400">
            {t("dashboard.home.downloadClientUnreachable")}
          </p>
        )}

        {!isLoading && enabled && connected && empty && (
          <p className="py-2 text-center text-sm text-neutral-400">
            {t("dashboard.home.nothingDownloading")}
          </p>
        )}

        {items.length > 0 && (
          <div>
            <ul className="space-y-3">
              {items.slice(0, ACTIVE_SHOWN).map((item) => (
                <ActiveDownloadRow key={item.id} item={item} />
              ))}
            </ul>
            {items.length > ACTIVE_SHOWN && (
              <p className="mt-2 text-xs text-neutral-500">
                {t("dashboard.home.pendingMore", {
                  count: items.length - ACTIVE_SHOWN,
                })}
              </p>
            )}
          </div>
        )}

        {pending.length > 0 && (
          <div>
            <Kicker>
              {t("dashboard.home.pendingDelay")} ({pending.length})
            </Kicker>
            <ul className="mt-2 space-y-3">
              {pending.slice(0, PENDING_SHOWN).map((p) => (
                <PendingReleaseRow
                  key={p.target_key}
                  item={p}
                  now={now}
                  busy={grabNow.isPending && grabNow.variables === p.target_key}
                  onGrabNow={(key) => grabNow.mutate(key)}
                />
              ))}
            </ul>
            {pending.length > PENDING_SHOWN && (
              <p className="mt-2 text-xs text-neutral-500">
                {t("dashboard.home.pendingMore", {
                  count: pending.length - PENDING_SHOWN,
                })}
              </p>
            )}
          </div>
        )}
      </div>
    </WidgetShell>
  );
}
