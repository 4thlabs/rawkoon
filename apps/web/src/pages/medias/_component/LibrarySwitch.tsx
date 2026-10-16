import { Link } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { useFeatures } from "@/lib/routing/useFeatures";
import { cn } from "@/lib/utils";

/** Movies & Shows · Books, shown only when books are enabled. */
export function LibrarySwitch({ active }: { active: "media" | "books" }) {
  const { t } = useTranslation("common");
  const { data: features } = useFeatures();
  if (!features?.books_enabled) return null;

  const tab = (isActive: boolean) =>
    cn(
      "focus-ring rounded-full px-4 py-1.5 text-sm font-medium transition-colors",
      isActive
        ? "bg-white/[0.1] text-white"
        : "text-neutral-400 hover:bg-white/[0.05] hover:text-neutral-200",
    );

  return (
    <nav
      aria-label={t("medias.library.switchLabel")}
      className="mb-4 flex gap-1"
    >
      <Link
        to="/library"
        aria-current={active === "media" ? "page" : undefined}
        className={tab(active === "media")}
      >
        {t("medias.library.switchMedia")}
      </Link>
      <Link
        to="/books"
        aria-current={active === "books" ? "page" : undefined}
        className={tab(active === "books")}
      >
        {t("medias.library.switchBooks")}
      </Link>
    </nav>
  );
}
