import { useState, type ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import type { TFunction } from "i18next";
import { Workflow } from "lucide-react";
import { APP_PATHS } from "@rawkoon/shared/constants";
import type { DashboardPipeline } from "@rawkoon/shared/types";
import { useCurrentUser } from "@/lib/auth/useAuth";
import { cn } from "@/lib/utils";
import { formatSpeed } from "@/lib/utils/format";
import { formatRelativeTime } from "@/lib/utils/relativeTime";
import { formatDuration } from "@/features/transcode/format";
import { WidgetHeader, WidgetShell } from "@/pages/_component/widgetPrimitives";
import { usePipeline } from "@/pages/_component/usePipeline";

/** Phones show this many rows before "n more". */
const PHONE_ROWS = 3;

type Tone = "active" | "warn" | "bad" | "idle";

const LAMP: Record<Tone, string> = {
  active: "bg-primary-400",
  warn: "bg-amber-400",
  bad: "bg-red-400",
  idle: "bg-neutral-700",
};

type PipelineTarget =
  | "/activity/queue"
  | "/settings/health"
  | typeof APP_PATHS.settingsReencode;

interface RowSpec {
  key: string;
  to: PipelineTarget;
  title: string;
  subtitle: string;
  value: string;
  tone: Tone;
  /** The Downloading lamp is the only one that breathes, and only while active. */
  breathing?: boolean;
  muted: boolean;
  unavailable: boolean;
  extra?: ReactNode;
}

function Lamp({ tone, breathing }: { tone: Tone; breathing?: boolean }) {
  return (
    <span
      aria-hidden
      className={cn(
        "mt-1.5 h-2 w-2 shrink-0 rounded-full",
        LAMP[tone],
        breathing && "motion-safe:animate-pulse",
      )}
    />
  );
}

function Row({ row, hiddenOnPhone }: { row: RowSpec; hiddenOnPhone: boolean }) {
  return (
    <Link
      to={row.to}
      data-testid={`pipeline-row-${row.key}`}
      data-state={
        row.unavailable ? "unavailable" : row.muted ? "idle" : "active"
      }
      className={cn(
        "focus-ring flex items-start gap-3 px-4 py-3 transition-colors hover:bg-neutral-800/40",
        hiddenOnPhone && "hidden md:flex",
      )}
    >
      <Lamp tone={row.tone} breathing={row.breathing} />
      <div className="min-w-0 flex-1">
        <p
          className={cn(
            "text-sm font-medium",
            row.muted ? "text-neutral-400" : "text-neutral-100",
          )}
        >
          {row.title}
        </p>
        <p
          className={cn(
            "text-xs",
            row.tone === "bad" ? "text-red-300" : "text-neutral-500",
          )}
        >
          {row.subtitle}
        </p>
        {row.extra}
      </div>
      <span
        className={cn(
          "shrink-0 font-mono text-sm tabular-nums",
          row.muted ? "text-neutral-500" : "text-neutral-100",
        )}
      >
        {row.value}
      </span>
    </Link>
  );
}

function DownloadItems({
  items,
}: {
  items: DashboardPipeline["downloading"]["items"];
}) {
  const { t } = useTranslation("common");
  return (
    <ul className="mt-2 space-y-2">
      {items.map((item) => {
        const pct = Math.round(Math.max(0, Math.min(1, item.progress)) * 100);
        return (
          <li key={item.id} className="min-w-0">
            <div className="flex items-baseline justify-between gap-2 text-xs">
              <span className="truncate text-neutral-300">{item.title}</span>
              <span className="shrink-0 font-mono tabular-nums text-neutral-400">
                {pct}%
              </span>
            </div>
            <div className="mt-1 h-1 overflow-hidden rounded-full bg-neutral-800">
              <div
                role="progressbar"
                aria-label={item.title}
                aria-valuenow={pct}
                aria-valuemin={0}
                aria-valuemax={100}
                className="h-full rounded-full bg-primary-500"
                style={{ width: `${pct}%` }}
              />
            </div>
            {item.eta_seconds != null && item.eta_seconds > 0 && (
              <p className="mt-0.5 text-[11px] text-neutral-500">
                {t("dashboard.pipeline.etaLeft", {
                  time: formatDuration(item.eta_seconds),
                })}
              </p>
            )}
          </li>
        );
      })}
    </ul>
  );
}

function buildRows(
  data: DashboardPipeline,
  t: TFunction<"common">,
  language: string,
): RowSpec[] {
  const unavailableText = t("dashboard.pipeline.unavailable");
  const queue = "/activity/queue" as const;
  const health = "/settings/health" as const;

  const { downloading, delayed, attention, rss, reencode } = data;

  const dl: RowSpec = {
    key: "downloading",
    to: queue,
    title: t("dashboard.pipeline.downloading"),
    subtitle: "",
    value: "",
    tone: "idle",
    muted: true,
    unavailable: !downloading.available,
  };
  if (!downloading.available) {
    dl.subtitle = unavailableText;
    dl.value = "-";
  } else if (downloading.count === 0) {
    dl.subtitle = t("dashboard.pipeline.nothingDownloading");
    dl.value = "0";
  } else {
    dl.subtitle = t("dashboard.pipeline.downloadingCount", {
      count: downloading.count,
    });
    dl.value = formatSpeed(downloading.speed_bytes_per_sec);
    dl.tone = "active";
    dl.breathing = true;
    dl.muted = false;
    dl.extra = <DownloadItems items={downloading.items} />;
  }

  const dy: RowSpec = {
    key: "delayed",
    to: queue,
    title: t("dashboard.pipeline.delayed"),
    subtitle: "",
    value: "",
    tone: "idle",
    muted: true,
    unavailable: !delayed.available,
  };
  if (!delayed.available) {
    dy.subtitle = unavailableText;
    dy.value = "-";
  } else if (delayed.count === 0) {
    dy.subtitle = t("dashboard.pipeline.noDelayed");
    dy.value = "0";
  } else {
    dy.subtitle = t("dashboard.pipeline.delayedWaiting", {
      count: delayed.count,
    });
    dy.value = String(delayed.count);
    dy.tone = "warn";
    dy.muted = false;
  }

  const at: RowSpec = {
    key: "attention",
    to: health,
    title: t("dashboard.pipeline.attention"),
    subtitle: "",
    value: "",
    tone: "idle",
    muted: true,
    unavailable: !attention.available,
  };
  if (!attention.available) {
    at.subtitle = unavailableText;
    at.value = "-";
  } else if (attention.count === 0) {
    at.subtitle = t("dashboard.pipeline.allClear");
    at.value = "0";
  } else {
    at.subtitle = t("dashboard.pipeline.attentionSplit", {
      alerts: attention.alerts,
      gaveUp: attention.gave_up,
    });
    at.value = String(attention.count);
    at.tone = "bad";
    at.muted = false;
  }

  const lastRun = formatRelativeTime(rss.last_run_at, language);
  const nextRun = formatRelativeTime(rss.next_run_at, language);
  const rs: RowSpec = {
    key: "rss",
    to: health,
    title: t("dashboard.pipeline.rss"),
    subtitle: "",
    value: "",
    tone: "idle",
    muted: true,
    unavailable: !rss.available,
  };
  if (!rss.available) {
    rs.subtitle = unavailableText;
    rs.value = "-";
  } else if (rss.last_run_at == null) {
    rs.subtitle = nextRun
      ? t("dashboard.pipeline.rssNeverNext", { next: nextRun })
      : t("dashboard.pipeline.rssNever");
    rs.value = "-";
  } else if (rss.ok === false) {
    rs.subtitle = t("dashboard.pipeline.rssFailed");
    rs.value = lastRun ?? "-";
    rs.tone = "bad";
    rs.muted = false;
  } else {
    rs.subtitle = nextRun
      ? t("dashboard.pipeline.rssOkNext", {
          count: rss.releases_found ?? 0,
          next: nextRun,
        })
      : t("dashboard.pipeline.rssOk", { count: rss.releases_found ?? 0 });
    rs.value = lastRun ?? "-";
  }

  const re: RowSpec = {
    key: "reencode",
    to: APP_PATHS.settingsReencode,
    title: t("dashboard.pipeline.reencode"),
    subtitle: "",
    value: "",
    tone: "idle",
    muted: true,
    unavailable: !reencode.available,
  };
  if (!reencode.available) {
    re.subtitle = unavailableText;
    re.value = "-";
  } else if (reencode.active === 0 && reencode.queued === 0) {
    re.subtitle = t("dashboard.pipeline.nothingReencoding");
    re.value = "0";
  } else {
    re.subtitle = t("dashboard.pipeline.reencodeCounts", {
      active: reencode.active,
      queued: reencode.queued,
    });
    re.value = String(reencode.active + reencode.queued);
    re.tone = reencode.active > 0 ? "active" : "idle";
    re.muted = false;
  }

  return [dl, dy, at, rs, re];
}

function PipelineSkeleton() {
  return (
    <div className="space-y-3 px-4 py-3" aria-hidden>
      {[0, 1, 2].map((i) => (
        <div key={i} className="flex items-center gap-3">
          <div className="h-2 w-2 animate-pulse rounded-full bg-neutral-800" />
          <div className="h-3 flex-1 animate-pulse rounded bg-neutral-800" />
        </div>
      ))}
    </div>
  );
}

/**
 * Admin-only answer to "is the pipeline working?": one row per stage, each
 * linking to the page that holds the detail. Idle rows stay, muted, so the
 * card never changes shape; a source that failed says so instead of reading idle.
 */
export function PipelineCard() {
  const { t, i18n } = useTranslation("common");
  const isAdmin = useCurrentUser().data?.is_admin === true;
  const { data, isLoading, isError } = usePipeline(isAdmin);
  const [expanded, setExpanded] = useState(false);

  if (!isAdmin) return null;

  const rows = data ? buildRows(data, t, i18n.language) : [];
  const hidden = rows.length - PHONE_ROWS;

  return (
    <WidgetShell
      className="border-primary-500/30"
      aria-label={t("dashboard.pipeline.title")}
    >
      <WidgetHeader icon={Workflow} title={t("dashboard.pipeline.title")} />
      {isLoading && <PipelineSkeleton />}
      {isError && !data && (
        <p className="px-4 py-4 text-sm text-neutral-400">
          {t("dashboard.pipeline.loadError")}
        </p>
      )}
      {data && (
        <div className="divide-y divide-neutral-800/60">
          {rows.map((row, i) => (
            <Row
              key={row.key}
              row={row}
              hiddenOnPhone={!expanded && i >= PHONE_ROWS}
            />
          ))}
          {!expanded && hidden > 0 && (
            <button
              type="button"
              onClick={() => setExpanded(true)}
              className="focus-ring block w-full px-4 py-2.5 text-left text-xs font-medium text-primary-300 hover:bg-neutral-800/40 md:hidden"
            >
              {t("dashboard.pipeline.more", { count: hidden })}
            </button>
          )}
        </div>
      )}
    </WidgetShell>
  );
}
