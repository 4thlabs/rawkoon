import { createFileRoute } from "@tanstack/react-router";
import { settingsGuard } from "@/pages/settings/_lib/settingsGuard";
import { SecurityPage } from "@/pages/settings/_pages/SecurityPage";

export const Route = createFileRoute("/settings/security/")({
  beforeLoad: settingsGuard({ adminOnly: false }),
  component: SecurityPage,
});
