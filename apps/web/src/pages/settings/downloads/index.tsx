import { createFileRoute } from "@tanstack/react-router";
import { settingsGuard } from "@/pages/settings/_lib/settingsGuard";
import { DownloadsSettingsPage } from "@/pages/settings/_pages/DownloadsSettingsPage";
import type { DownloadsView } from "@/pages/settings/_pages/DownloadsSettingsPage";

const VIEWS: DownloadsView[] = [
  "import",
  "seeding",
  "orphans",
  "history",
  "arr",
];

export const Route = createFileRoute("/settings/downloads/")({
  validateSearch: (
    search: Record<string, unknown>,
  ): { view?: DownloadsView } => ({
    view: VIEWS.includes(search.view as DownloadsView)
      ? (search.view as DownloadsView)
      : undefined,
  }),
  beforeLoad: settingsGuard({ adminOnly: true }),
  component: DownloadsSettingsPage,
});
