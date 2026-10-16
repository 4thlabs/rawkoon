import { createFileRoute } from "@tanstack/react-router";
import { settingsGuard } from "@/pages/settings/_lib/settingsGuard";
import { ReencodePage } from "@/pages/settings/_pages/ReencodePage";

export const Route = createFileRoute("/settings/reencode/")({
  beforeLoad: settingsGuard({ adminOnly: true }),
  component: ReencodePage,
});
