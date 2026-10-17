import {
  cloneElement,
  forwardRef,
  useEffect,
  useState,
  type ButtonHTMLAttributes,
  type ReactElement,
  type ReactNode,
} from "react";
import { useTranslation } from "react-i18next";
import { Search, SlidersHorizontal, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { MobileBottomSheet } from "@/components/ui/mobile-bottom-sheet";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

const DESKTOP_QUERY = "(min-width: 640px)";

function useIsDesktop(): boolean {
  const [matches, setMatches] = useState(() =>
    typeof window !== "undefined" && window.matchMedia
      ? window.matchMedia(DESKTOP_QUERY).matches
      : true,
  );
  useEffect(() => {
    if (!window.matchMedia) return;
    const mql = window.matchMedia(DESKTOP_QUERY);
    const onChange = () => setMatches(mql.matches);
    onChange();
    mql.addEventListener("change", onChange);
    return () => mql.removeEventListener("change", onChange);
  }, []);
  return matches;
}

interface FilterButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  /** Number of active filters; the badge is hidden at zero. */
  count?: number;
}

/** The toolbar button that opens a FilterPanel. */
export const FilterButton = forwardRef<HTMLButtonElement, FilterButtonProps>(
  ({ count = 0, className, children, ...props }, ref) => {
    const { t } = useTranslation("common");
    return (
      <button
        ref={ref}
        type="button"
        className={cn(
          "focus-ring inline-flex h-10 items-center gap-2 rounded-xl border px-3.5 text-sm font-medium transition-colors",
          count > 0
            ? "border-primary-500/40 bg-primary-500/10 text-primary-300"
            : "border-neutral-700 bg-neutral-900 text-neutral-300 hover:border-neutral-600 hover:text-neutral-100",
          className,
        )}
        {...props}
      >
        <SlidersHorizontal size={14} aria-hidden />
        {children ?? t("filters.button")}
        {count > 0 && (
          <span className="min-w-5 rounded-full bg-primary-500/20 px-1.5 py-px text-center font-mono text-[11px] tabular-nums leading-snug text-primary-200">
            {count}
          </span>
        )}
      </button>
    );
  },
);
FilterButton.displayName = "FilterButton";

interface FilterPanelProps {
  /** A FilterButton (or any ref-forwarding button); the panel wires its open state. */
  trigger: ReactElement<{ onClick?: () => void }>;
  title: string;
  /** Shown at the foot of the panel, e.g. "7 titles". */
  resultCount?: ReactNode;
  /** The groups: FilterGroup elements. */
  children: ReactNode;
  /** Reset button; omit it when nothing is active. */
  onReset?: () => void;
  /** Runs after the panel closes from Done. */
  onDone?: () => void;
}

/** One filter shell: a popover from 640px up, a bottom sheet below. */
export function FilterPanel({
  trigger,
  title,
  resultCount,
  children,
  onReset,
  onDone,
}: FilterPanelProps) {
  const { t } = useTranslation("common");
  const isDesktop = useIsDesktop();
  const [open, setOpen] = useState(false);

  const close = () => {
    setOpen(false);
    onDone?.();
  };

  const footer = (
    <>
      <span
        className="mr-auto text-sm tabular-nums text-neutral-400"
        aria-live="polite"
      >
        {resultCount}
      </span>
      {onReset && (
        <button
          type="button"
          onClick={onReset}
          className="focus-ring rounded-lg px-3 py-2 text-sm text-neutral-300 transition-colors hover:bg-neutral-800 hover:text-neutral-100"
        >
          {t("filters.reset")}
        </button>
      )}
      <button
        type="button"
        onClick={close}
        className="focus-ring rounded-lg bg-primary-600 px-5 py-2 text-sm font-semibold text-neutral-950 transition-colors hover:bg-primary-500"
      >
        {t("filters.done")}
      </button>
    </>
  );

  if (!isDesktop) {
    return (
      <>
        {cloneElement(trigger, { onClick: () => setOpen(true) })}
        <MobileBottomSheet
          open={open}
          onClose={close}
          title={title}
          closeLabel={t("common.close")}
          bodyClassName="space-y-6"
          footer={footer}
        >
          {children}
        </MobileBottomSheet>
      </>
    );
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>{trigger}</PopoverTrigger>
      <PopoverContent
        align="start"
        sideOffset={8}
        aria-label={title}
        className="w-[min(24rem,calc(100vw-2rem))] border-neutral-700 bg-surface-raised p-0"
      >
        <div className="max-h-[min(70vh,32rem)] space-y-5 overflow-y-auto p-4">
          {children}
        </div>
        <div className="flex items-center gap-2 border-t border-neutral-800 px-4 py-3">
          {footer}
        </div>
      </PopoverContent>
    </Popover>
  );
}

/** A labelled section of a FilterPanel. */
export function FilterGroup({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <section role="group" aria-label={label}>
      <h3 className="mb-2 font-sans text-sm font-medium text-neutral-300">
        {label}
      </h3>
      {children}
    </section>
  );
}

export interface FilterOption<T extends string> {
  id: T;
  label: string;
  /** Small machine figure beside the label, e.g. a count. */
  count?: number | string;
}

interface FilterOptionsProps<T extends string> {
  options: FilterOption<T>[];
  value: T;
  onChange: (value: T) => void;
  ariaLabel: string;
}

/** Equal-width segmented control, for two to four short options. */
export function FilterSegmented<T extends string>({
  options,
  value,
  onChange,
  ariaLabel,
}: FilterOptionsProps<T>) {
  return (
    <div
      role="radiogroup"
      aria-label={ariaLabel}
      className="flex rounded-lg border border-neutral-700 bg-surface-inset p-0.5"
    >
      {options.map((o) => {
        const active = o.id === value;
        return (
          <button
            key={o.id}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onChange(o.id)}
            className={cn(
              "focus-ring flex min-h-8 flex-1 items-center justify-center gap-1.5 rounded-md px-2 text-sm font-medium transition-colors",
              active
                ? "bg-neutral-700 text-neutral-50"
                : "text-neutral-400 hover:text-neutral-200",
            )}
          >
            {o.label}
            {o.count !== undefined && (
              <span className="font-mono text-[11px] tabular-nums text-neutral-400">
                {o.count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

/** Wrapping pill choices, for a longer single-choice list. */
export function FilterChoices<T extends string>({
  options,
  value,
  onChange,
  ariaLabel,
}: FilterOptionsProps<T>) {
  return (
    <div
      role="radiogroup"
      aria-label={ariaLabel}
      className="flex flex-wrap gap-2"
    >
      {options.map((o) => {
        const active = o.id === value;
        return (
          <button
            key={o.id}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onChange(o.id)}
            className={cn(
              "focus-ring min-h-8 rounded-full border px-3 text-sm font-medium transition-colors",
              active
                ? "border-primary-500/40 bg-primary-500/15 text-primary-300"
                : "border-neutral-700 text-neutral-300 hover:border-neutral-600 hover:text-neutral-100",
            )}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

export interface ActiveFilterChip {
  id: string;
  label: string;
  onRemove: () => void;
}

/** Removable chips for the filters in effect, with a Clear all. */
export function ActiveFilterChips({
  chips,
  onClearAll,
}: {
  chips: ActiveFilterChip[];
  onClearAll: () => void;
}) {
  const { t } = useTranslation("common");
  if (chips.length === 0) return null;
  return (
    <ul
      aria-label={t("filters.active")}
      className="flex flex-wrap items-center gap-2"
    >
      {chips.map((c) => (
        <li key={c.id}>
          <button
            type="button"
            onClick={c.onRemove}
            aria-label={t("filters.remove", { label: c.label })}
            className="focus-ring inline-flex h-7 items-center gap-1.5 rounded-full border border-primary-500/30 bg-primary-500/10 pl-3 pr-2 text-xs font-medium text-primary-300 transition-colors hover:bg-primary-500/20"
          >
            {c.label}
            <X size={12} aria-hidden />
          </button>
        </li>
      ))}
      {chips.length > 1 && (
        <li>
          <button
            type="button"
            onClick={onClearAll}
            className="focus-ring rounded-md px-2 py-1 text-xs text-neutral-400 transition-colors hover:text-neutral-100"
          >
            {t("filters.clearAll")}
          </button>
        </li>
      )}
    </ul>
  );
}

/** Search box for a filter toolbar. */
export function ToolbarSearch({
  value,
  onChange,
  placeholder,
  className,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  className?: string;
}) {
  return (
    <div className={cn("relative min-w-0", className)}>
      <Search
        size={14}
        aria-hidden
        className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400"
      />
      <input
        type="search"
        aria-label={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="focus-ring h-10 w-full rounded-xl border border-neutral-700 bg-neutral-900 pl-9 pr-3 text-sm text-neutral-100 transition focus:border-primary-500"
      />
    </div>
  );
}
