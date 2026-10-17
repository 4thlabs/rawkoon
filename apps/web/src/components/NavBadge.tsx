import { cn } from "@/lib/utils";

/** A small count pill; renders nothing at zero. */
export function NavBadge({
  count,
  className,
}: {
  count: number;
  className?: string;
}) {
  if (count <= 0) return null;
  return (
    <span
      data-testid="nav-badge"
      className={cn(
        "flex h-4 min-w-4 items-center justify-center rounded-full bg-primary-500 px-1 text-[10px] font-semibold leading-none text-neutral-950",
        className,
      )}
    >
      {count > 99 ? "99+" : count}
    </span>
  );
}
