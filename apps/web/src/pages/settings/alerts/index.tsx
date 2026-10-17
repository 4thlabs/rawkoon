import { createFileRoute } from "@tanstack/react-router";
import { settingsGuard } from "@/pages/settings/_lib/settingsGuard";
import { AlertsPage } from "@/pages/settings/_pages/AlertsPage";

export const Route = createFileRoute("/settings/alerts/")({
  beforeLoad: settingsGuard({ adminOnly: false }),
  component: AlertsPage,
});
