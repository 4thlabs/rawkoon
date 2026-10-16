import { createFileRoute } from "@tanstack/react-router";
import { settingsGuard } from "@/pages/settings/_lib/settingsGuard";
import { BlocklistPage } from "@/pages/settings/_pages/BlocklistPage";

export const Route = createFileRoute("/settings/blocklist/")({
  beforeLoad: settingsGuard({ adminOnly: true }),
  component: BlocklistPage,
});
