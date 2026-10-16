import { useState, type ReactNode } from "react";
import { Clapperboard, Info, Tv } from "lucide-react";
import { useTranslation } from "react-i18next";
import type { TmdbMediaSearchItem } from "@rawkoon/shared/types";
import { cn } from "@/lib/utils";

export interface QuickAction {
  id: string;
  title: string;
  description: string;
  icon: ReactNode;
  section: "titles" | "actions" | "medias" | "books" | "users";
  keywords?: string[];
  shortcut?: string;
  action: () => void;
  /** Set on TMDB title rows: the secondary path (Shift+Enter or the info button). */
  onDetails?: () => void;
  trailing?: ReactNode;
}

export function TitlePoster({ item }: { item: TmdbMediaSearchItem }) {
  const [failed, setFailed] = useState(false);
  if (item.poster_url && !failed) {
    return (
      <img
        src={item.poster_url}
        alt=""
        loading="lazy"
        onError={() => setFailed(true)}
        className="h-full w-full object-cover"
      />
    );
  }
  return item.media_type === "movie" ? (
    <Clapperboard size={20} />
  ) : (
    <Tv size={20} />
  );
}

interface QuickActionRowProps {
  action: QuickAction;
  /** Group heading rendered above this row, when it starts a group. */
  heading: string | null;
  isActive: boolean;
  /** Section tag shown at the right of non-title rows while searching. */
  sectionLabel: string | null;
  onHover: () => void;
}

export function QuickActionRow({
  action,
  heading,
  isActive,
  sectionLabel,
  onHover,
}: QuickActionRowProps) {
  const { t } = useTranslation("common");
  const isTitle = action.section === "titles";

  return (
    <div>
      {heading && (
        <p className="px-4 pb-1 pt-2 text-[11px] font-semibold uppercase tracking-wide text-neutral-500">
          {heading}
        </p>
      )}
      <div
        onMouseEnter={onHover}
        className={cn(
          "flex w-full items-center gap-1 rounded-2xl pr-2 transition-colors",
          isActive ? "bg-neutral-700/70" : "hover:bg-neutral-700/40",
        )}
      >
        <button
          type="button"
          onClick={action.action}
          className="flex min-w-0 flex-1 items-center gap-3 rounded-2xl px-4 py-3 text-left"
        >
          <div
            className={cn(
              "flex shrink-0 items-center justify-center overflow-hidden bg-neutral-800 text-neutral-400",
              isTitle ? "h-14 w-10 rounded-md" : "h-10 w-10 rounded-xl",
            )}
          >
            {action.icon}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate font-medium text-white">{action.title}</p>
            <p className="truncate text-sm text-neutral-400">
              {action.description}
            </p>
          </div>
          {action.trailing ? (
            action.trailing
          ) : action.shortcut ? (
            <span className="shrink-0 rounded-lg border px-2 py-1 text-[11px] font-semibold text-neutral-400 border-neutral-700">
              {action.shortcut}
            </span>
          ) : sectionLabel && !isTitle ? (
            <span className="shrink-0 rounded-md px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide bg-neutral-800 text-neutral-500">
              {sectionLabel}
            </span>
          ) : null}
        </button>
        {action.onDetails && (
          <button
            type="button"
            onClick={action.onDetails}
            aria-label={t("common.quickActionsDetails")}
            title={t("common.quickActionsDetails")}
            className="focus-ring flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-neutral-400 transition-colors hover:bg-neutral-600/60 hover:text-neutral-100"
          >
            <Info size={16} />
          </button>
        )}
      </div>
    </div>
  );
}
