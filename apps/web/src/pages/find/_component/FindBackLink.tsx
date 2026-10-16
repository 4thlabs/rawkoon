import { Link } from "@tanstack/react-router";
import { ChevronLeft } from "lucide-react";
import { useTranslation } from "react-i18next";

/** Back to the Find page from a shelf page. */
export function FindBackLink() {
  const { t } = useTranslation("common");
  return (
    <Link
      to="/find"
      className="focus-ring mb-3 inline-flex items-center gap-1 rounded-lg text-sm text-neutral-400 hover:text-neutral-100"
    >
      <ChevronLeft size={16} />
      {t("find.title")}
    </Link>
  );
}
