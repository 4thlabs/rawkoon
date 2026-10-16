import { createFileRoute } from "@tanstack/react-router";
import { settingsGuard } from "@/pages/settings/_lib/settingsGuard";
import { AiPage } from "@/pages/settings/_pages/AiPage";

export const Route = createFileRoute("/settings/ai/")({
  beforeLoad: settingsGuard({ adminOnly: true }),
  component: AiPage,
});
