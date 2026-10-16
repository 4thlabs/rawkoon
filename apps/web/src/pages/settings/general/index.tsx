import { createFileRoute } from "@tanstack/react-router";
import { settingsGuard } from "@/pages/settings/_lib/settingsGuard";
import { GeneralPage } from "@/pages/settings/_pages/GeneralPage";

export const Route = createFileRoute("/settings/general/")({
  beforeLoad: settingsGuard({ adminOnly: true }),
  component: GeneralPage,
});
