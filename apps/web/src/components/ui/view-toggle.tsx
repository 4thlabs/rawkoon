import { useTranslation } from "react-i18next";
import { Grid3X3, LayoutGrid, List, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export type ViewToggleMode = "grid" | "compact" | "list";

const ICONS: Record<ViewToggleMode, LucideIcon> = {
  grid: LayoutGrid,
  compact: Grid3X3,
  list: List,
};

/** Grid / compact / list switch shared by the library toolbars. */
export function ViewToggle<T extends ViewToggleMode>({
  value,
  onChange,
  modes,
  className,
}: {
  value: T;
  onChange: (value: T) => void;
  modes: readonly T[];
  className?: string;
}) {
  const { t } = useTranslation("common");
  return (
    <div
      role="radiogroup"
      aria-label={t("filters.view.label")}
      className={cn(
        "flex shrink-0 overflow-hidden rounded-xl border border-neutral-700 bg-neutral-900",
        className,
      )}
    >
      {modes.map((mode) => {
        const Icon: LucideIcon = ICONS[mode];
        const label = t(`filters.view.${mode}`);
        return (
          <button
            key={mode}
            type="button"
            role="radio"
            aria-checked={value === mode}
            aria-label={label}
            title={label}
            onClick={() => onChange(mode)}
            className={cn(
              "focus-ring flex h-10 w-10 items-center justify-center transition-colors",
              value === mode
                ? "bg-neutral-800 text-neutral-50"
                : "text-neutral-400 hover:text-neutral-200",
            )}
          >
            <Icon size={15} aria-hidden />
          </button>
        );
      })}
    </div>
  );
}
