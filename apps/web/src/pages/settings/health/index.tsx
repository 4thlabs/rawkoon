import { createFileRoute } from "@tanstack/react-router";
import { settingsGuard } from "@/pages/settings/_lib/settingsGuard";
import { HealthPage } from "@/pages/settings/_pages/HealthPage";

export const Route = createFileRoute("/settings/health/")({
  beforeLoad: settingsGuard({ adminOnly: true }),
  component: HealthPage,
});
