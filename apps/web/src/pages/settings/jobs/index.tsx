import { createFileRoute } from "@tanstack/react-router";
import { settingsGuard } from "@/pages/settings/_lib/settingsGuard";
import { JobsPage } from "@/pages/settings/_pages/JobsPage";

export const Route = createFileRoute("/settings/jobs/")({
  beforeLoad: settingsGuard({ adminOnly: true }),
  component: JobsPage,
});
