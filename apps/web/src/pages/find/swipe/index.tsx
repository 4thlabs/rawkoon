import { createFileRoute, redirect } from "@tanstack/react-router";
import { useEffect } from "react";
import { useTranslation } from "react-i18next";
import { getCurrentUser } from "@/lib/auth";
import { FindModeSwitch } from "@/pages/find/_component/FindModeSwitch";
import { rememberFindMode } from "@/pages/find/_component/findMode";
import { DiscoverDeck } from "@/pages/find/swipe/_component/DiscoverDeck";

function SwipePage() {
  const { t } = useTranslation("common");
  useEffect(() => rememberFindMode("swipe"), []);
  return (
    <div className="page-transition px-4 py-6">
      <div className="mb-6 flex flex-wrap items-center justify-center gap-3 sm:justify-between">
        <h1 className="font-display text-2xl font-semibold text-text-strong">
          {t("find.title")}
        </h1>
        <FindModeSwitch mode="swipe" />
      </div>
      <DiscoverDeck />
    </div>
  );
}

export const Route = createFileRoute("/find/swipe/")({
  beforeLoad: async () => {
    try {
      const user = await getCurrentUser();
      if (!user) throw redirect({ to: "/login" });
      return { user };
    } catch (e: unknown) {
      if ((e as { status?: number })?.status === 429) return { user: null };
      throw e;
    }
  },
  component: SwipePage,
});
