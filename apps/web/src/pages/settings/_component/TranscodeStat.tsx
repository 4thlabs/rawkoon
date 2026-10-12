import { cn } from "@/lib/utils";

export function TranscodeStat({
  label,
  value,
  hint,
  tone,
}: {
  label: string;
  value: string;
  hint: string;
  tone?: string;
}) {
  return (
    <div className="rounded-xl border border-neutral-800 bg-neutral-900 px-3.5 py-3">
      <div className="text-[10px] font-bold uppercase tracking-[0.15em] text-neutral-400">
        {label}
      </div>
      <div
        className={cn(
          "mt-0.5 font-display text-xl font-semibold text-neutral-50",
          tone,
        )}
      >
        {value}
      </div>
      <div className="text-xs text-neutral-500">{hint}</div>
    </div>
  );
}
