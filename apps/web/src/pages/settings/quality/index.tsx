import { createFileRoute } from "@tanstack/react-router";
import { settingsGuard } from "@/pages/settings/_lib/settingsGuard";
import { QualityPage } from "@/pages/settings/_pages/QualityPage";

export const Route = createFileRoute("/settings/quality/")({
  validateSearch: (search: Record<string, unknown>): { edit?: number } => ({
    edit: Number(search.edit) > 0 ? Number(search.edit) : undefined,
  }),
  beforeLoad: settingsGuard({ adminOnly: true }),
  component: QualityPage,
});
