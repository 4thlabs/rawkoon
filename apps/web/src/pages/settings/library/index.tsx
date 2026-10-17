import { createFileRoute } from "@tanstack/react-router";
import { settingsGuard } from "@/pages/settings/_lib/settingsGuard";
import { LibrarySettingsPage } from "@/pages/settings/_pages/LibrarySettingsPage";

export const Route = createFileRoute("/settings/library/")({
  beforeLoad: settingsGuard({ adminOnly: true }),
  component: LibrarySettingsPage,
});
