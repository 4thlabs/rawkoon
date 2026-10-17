import { Link, useNavigate } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { Headphones } from "lucide-react";
import { WidgetShell, WidgetHeader } from "@/pages/_component/widgetPrimitives";
import {
  useListeningProgress,
  useReadingProgress,
} from "@/features/player/usePlayback";
import { usePlayer } from "@/features/player/PlayerProvider";
import { BookCover } from "@/pages/books/_component/BookCover";
import { formatClock } from "@/features/player/formatClock";
import { cn } from "@/lib/utils";
import { continueItems } from "./continueItems";

/** Cards on Home; the rest sit behind "See all". */
const CONTINUE_SHOWN = 2;

export function ContinueListeningWidget() {
  const { t } = useTranslation("common");
  const navigate = useNavigate();
  const player = usePlayer();
  const listening = useListeningProgress();
  const reading = useReadingProgress();

  if (listening.isError && reading.isError) return null;
  if (listening.isLoading && reading.isLoading) return null;

  const items = continueItems(
    listening.data?.progress ?? [],
    reading.data?.progress ?? [],
  );
  if (items.length === 0) return null;

  const shown = items.slice(0, CONTINUE_SHOWN);

  return (
    <WidgetShell>
      <WidgetHeader icon={Headphones} title={t("dashboard.home.continue")} />
      <div className="grid divide-y divide-neutral-800/60 sm:grid-cols-2 sm:gap-3 sm:divide-y-0 sm:p-3">
        {shown.map((item, i) => (
          <button
            key={`${item.kind}-${item.editionId}`}
            type="button"
            className={cn(
              "focus-ring w-full gap-3 px-4 py-3 text-left hover:bg-neutral-900/60 sm:rounded-lg sm:border sm:border-neutral-800",
              // Phones show one card, wider screens two.
              i === 0 ? "flex" : "hidden sm:flex",
            )}
            onClick={() => {
              if (item.kind === "audiobook") {
                void player.load(item.editionId, item.bookId);
                void navigate({
                  to: "/books/$bookId/listen",
                  params: { bookId: String(item.bookId) },
                });
                return;
              }
              void navigate({
                to: "/books/$bookId/read",
                params: { bookId: String(item.bookId) },
              });
            }}
          >
            <BookCover title={item.title} coverUrl={item.coverUrl} size="row" />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-neutral-100">
                {item.title}
              </p>
              <p className="truncate text-xs text-neutral-500">
                {item.authors.join(", ")}
              </p>
              <p className="mt-0.5 font-mono text-[11px] text-neutral-500">
                {item.kind === "audiobook" && item.remainingSecs != null
                  ? formatClock(item.remainingSecs)
                  : `${Math.round(item.progressFraction * 100)}%`}
              </p>
              <div className="mt-1.5 h-1 overflow-hidden rounded-full bg-neutral-800">
                <div
                  className="h-full rounded-full bg-primary-500"
                  style={{
                    width: `${Math.round(item.progressFraction * 100)}%`,
                  }}
                />
              </div>
            </div>
          </button>
        ))}
      </div>
      {items.length > 1 && (
        <Link
          to="/books"
          className={cn(
            "focus-ring block border-t border-neutral-800/60 px-4 py-2.5 text-xs text-neutral-400 hover:text-neutral-100",
            items.length <= CONTINUE_SHOWN && "sm:hidden",
          )}
        >
          {t("dashboard.home.seeAll")}
        </Link>
      )}
    </WidgetShell>
  );
}
