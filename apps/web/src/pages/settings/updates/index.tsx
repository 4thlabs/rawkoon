import { createFileRoute } from "@tanstack/react-router";
import { settingsGuard } from "@/pages/settings/_lib/settingsGuard";
import { UpdatesPage } from "@/pages/settings/_pages/UpdatesPage";

export const Route = createFileRoute("/settings/updates/")({
  beforeLoad: settingsGuard({ adminOnly: true }),
  component: UpdatesPage,
});
