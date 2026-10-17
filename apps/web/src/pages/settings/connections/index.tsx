import { createFileRoute } from "@tanstack/react-router";
import { settingsGuard } from "@/pages/settings/_lib/settingsGuard";
import { ConnectionsPage } from "@/pages/settings/_pages/ConnectionsPage";

export const Route = createFileRoute("/settings/connections/")({
  beforeLoad: settingsGuard({ adminOnly: true }),
  component: ConnectionsPage,
});
