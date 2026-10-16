import { Link } from "@tanstack/react-router";
import { LayoutGrid, Layers } from "lucide-react";
import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";
import { rememberFindMode, type FindMode } from "@/lib/routing/findMode";

/** Browse | Swipe, the two ways to explore on the Find page. */
export function FindModeSwitch({ mode }: { mode: FindMode }) {
  const { t } = useTranslation("common");
  const base =
    "focus-ring inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-sm font-medium transition-colors";
  const on = "bg-white/[0.1] text-white";
  const off = "text-neutral-400 hover:text-neutral-200";

  return (
    <nav
      aria-label={t("find.modeLabel")}
      className="inline-flex rounded-full border border-neutral-800 bg-neutral-900 p-0.5"
    >
      <Link
        to="/find"
        onClick={() => rememberFindMode("browse")}
        aria-current={mode === "browse" ? "page" : undefined}
        className={cn(base, mode === "browse" ? on : off)}
      >
        <LayoutGrid size={14} />
        {t("find.browse")}
      </Link>
      <Link
        to="/find/swipe"
        onClick={() => rememberFindMode("swipe")}
        aria-current={mode === "swipe" ? "page" : undefined}
        className={cn(base, mode === "swipe" ? on : off)}
      >
        <Layers size={14} />
        {t("find.swipe")}
      </Link>
    </nav>
  );
}
