import {
  cloneElement,
  useRef,
  useState,
  type KeyboardEvent,
  type ReactElement,
  type ReactNode,
} from "react";
import { cn } from "@/lib/utils";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

export type ActionMenuEntry =
  | {
      id: string;
      label: string;
      icon?: ReactNode;
      /** Quiet text on the right, e.g. the tab the item switches to. */
      hint?: string;
      destructive?: boolean;
      disabled?: boolean;
      onSelect: () => void;
    }
  | "separator";

interface ActionMenuProps {
  /** A ref-forwarding button; the menu wires its open state. */
  trigger: ReactElement;
  /** Accessible name of the menu. */
  label: string;
  items: ActionMenuEntry[];
  align?: "start" | "center" | "end";
}

/** A short list of actions in a popover, with arrow-key navigation. */
export function ActionMenu({
  trigger,
  label,
  items,
  align = "end",
}: ActionMenuProps) {
  const [open, setOpen] = useState(false);
  const listRef = useRef<HTMLDivElement>(null);

  const move = (event: KeyboardEvent<HTMLDivElement>) => {
    const buttons = Array.from(
      listRef.current?.querySelectorAll<HTMLButtonElement>(
        "button[role=menuitem]:not(:disabled)",
      ) ?? [],
    );
    if (buttons.length === 0) return;
    const at = buttons.indexOf(document.activeElement as HTMLButtonElement);
    const step = (delta: number) =>
      buttons[(at + delta + buttons.length) % buttons.length]?.focus();
    if (event.key === "ArrowDown") step(1);
    else if (event.key === "ArrowUp") step(-1);
    else if (event.key === "Home") buttons[0]?.focus();
    else if (event.key === "End") buttons[buttons.length - 1]?.focus();
    else return;
    event.preventDefault();
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        {cloneElement(trigger as ReactElement<{ "aria-haspopup"?: string }>, {
          "aria-haspopup": "menu",
        })}
      </PopoverTrigger>
      <PopoverContent
        ref={listRef}
        align={align}
        sideOffset={8}
        role="menu"
        aria-label={label}
        onKeyDown={move}
        onOpenAutoFocus={(event) => {
          event.preventDefault();
          listRef.current
            ?.querySelector<HTMLButtonElement>("button[role=menuitem]")
            ?.focus();
        }}
        className="w-60 max-w-[calc(100vw-2rem)] border-neutral-700 bg-surface-raised p-1"
      >
        {items.map((entry, index) =>
          entry === "separator" ? (
            <div
              key={`sep-${index}`}
              role="separator"
              className="my-1 h-px bg-neutral-700/70"
            />
          ) : (
            <button
              key={entry.id}
              type="button"
              role="menuitem"
              disabled={entry.disabled}
              onClick={() => {
                setOpen(false);
                entry.onSelect();
              }}
              className={cn(
                "focus-ring flex min-h-10 w-full items-center gap-2.5 rounded-md px-2.5 py-2 text-left text-sm transition-colors disabled:opacity-50",
                entry.destructive
                  ? "text-red-300 hover:bg-red-950/40"
                  : "text-neutral-100 hover:bg-neutral-700/70",
              )}
            >
              {entry.icon && (
                <span
                  aria-hidden
                  className={cn(
                    "shrink-0",
                    entry.destructive ? "text-red-400" : "text-neutral-400",
                  )}
                >
                  {entry.icon}
                </span>
              )}
              <span className="min-w-0 flex-1 truncate">{entry.label}</span>
              {entry.hint && (
                <span className="shrink-0 text-xs text-neutral-400">
                  {entry.hint}
                </span>
              )}
            </button>
          ),
        )}
      </PopoverContent>
    </Popover>
  );
}
