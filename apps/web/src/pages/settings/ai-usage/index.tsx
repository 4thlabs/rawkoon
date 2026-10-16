import { createFileRoute } from "@tanstack/react-router";
import { settingsGuard } from "@/pages/settings/_lib/settingsGuard";
import { AiUsagePage } from "@/pages/settings/_pages/AiUsagePage";

export const Route = createFileRoute("/settings/ai-usage/")({
  beforeLoad: settingsGuard({ adminOnly: true }),
  component: AiUsagePage,
});
