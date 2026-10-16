import { createFileRoute } from "@tanstack/react-router";
import { settingsGuard } from "@/pages/settings/_lib/settingsGuard";
import { PeoplePage } from "@/pages/settings/_pages/PeoplePage";

export const Route = createFileRoute("/settings/people/")({
  beforeLoad: settingsGuard({ adminOnly: true }),
  component: PeoplePage,
});
