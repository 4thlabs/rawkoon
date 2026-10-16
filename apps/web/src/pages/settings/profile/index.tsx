import { createFileRoute } from "@tanstack/react-router";
import { settingsGuard } from "@/pages/settings/_lib/settingsGuard";
import { ProfilePage } from "@/pages/settings/_pages/ProfilePage";

export const Route = createFileRoute("/settings/profile/")({
  beforeLoad: settingsGuard({ adminOnly: false }),
  component: ProfilePage,
});
