import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export interface QuickAction {
  id: string;
  title: string;
  description: string;
  icon: ReactNode;
  section: "find" | "actions" | "medias" | "books" | "users";
  keywords?: string[];
  action: () => void;
}

interface QuickActionRowProps {
  action: QuickAction;
  id: string;
  isActive: boolean;
  /** Section tag shown at the right of a row while searching. */
  sectionLabel: string | null;
  onHover: () => void;
}

export function QuickActionRow({
  action,
  id,
  isActive,
  sectionLabel,
  onHover,
}: QuickActionRowProps) {
  return (
    <div role="presentation">
      <div
        id={id}
        role="option"
        aria-selected={isActive}
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
              "h-10 w-10 rounded-xl",
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
          {sectionLabel ? (
            <span className="shrink-0 rounded-md px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide bg-neutral-800 text-neutral-500">
              {sectionLabel}
            </span>
          ) : null}
        </button>
      </div>
    </div>
  );
}
