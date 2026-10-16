import type { ReactNode } from "react";
import { ChevronRight } from "lucide-react";
import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";

/** Rarely-changed fields, closed by default so a page shows only what most people touch. */
export function AdvancedDisclosure({
  children,
  label,
  defaultOpen = false,
  className,
}: {
  children: ReactNode;
  label?: string;
  defaultOpen?: boolean;
  className?: string;
}) {
  const { t } = useTranslation("common");
  return (
    <details
      open={defaultOpen}
      className={cn(
        "group rounded-lg border border-neutral-700/60 bg-neutral-900/30",
        className,
      )}
    >
      <summary className="focus-ring flex cursor-pointer list-none items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium text-neutral-300 hover:text-neutral-100 [&::-webkit-details-marker]:hidden">
        <ChevronRight
          size={14}
          className="transition-transform group-open:rotate-90"
          aria-hidden
        />
        {label ?? t("settings.advanced")}
      </summary>
      <div className="space-y-4 border-t border-neutral-700/60 p-4">
        {children}
      </div>
    </details>
  );
}
