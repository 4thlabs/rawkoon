import { createFileRoute } from "@tanstack/react-router";
import { settingsGuard } from "@/pages/settings/_lib/settingsGuard";
import { AppPage } from "@/pages/settings/_pages/AppPage";

export const Route = createFileRoute("/settings/app/")({
  beforeLoad: settingsGuard({ adminOnly: false }),
  component: AppPage,
});
