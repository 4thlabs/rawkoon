import { cn } from "@/lib/utils";
import type { FilterOption } from "@/features/medias/hooks/useInteractiveSearchState";

export type { FilterOption };

/** Multi-select pills for a long, data-driven list such as trackers or languages. */
export function ChipMultiSelect({
  options,
  selected,
  onChange,
  emptyText,
  ariaLabel,
}: {
  options: FilterOption[];
  selected: string[];
  onChange: (values: string[]) => void;
  emptyText: string;
  ariaLabel: string;
}) {
  const toggle = (key: string) => {
    onChange(
      selected.includes(key)
        ? selected.filter((k) => k !== key)
        : [...selected, key],
    );
  };

  if (options.length === 0) {
    return <p className="text-sm text-neutral-400">{emptyText}</p>;
  }

  return (
    <div role="group" aria-label={ariaLabel} className="flex flex-wrap gap-2">
      {options.map((option) => {
        const active = selected.includes(option.key);
        return (
          <button
            key={option.key}
            type="button"
            aria-pressed={active}
            onClick={() => toggle(option.key)}
            className={cn(
              "focus-ring min-h-8 rounded-full border px-3 text-sm font-medium transition-colors",
              active
                ? "border-primary-500/40 bg-primary-500/15 text-primary-300"
                : "border-neutral-700 text-neutral-300 hover:border-neutral-600 hover:text-neutral-100",
            )}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
