import { createFileRoute } from "@tanstack/react-router";
import { settingsGuard } from "@/pages/settings/_lib/settingsGuard";
import { AfterDownloadPage } from "@/pages/settings/_pages/AfterDownloadPage";

export const Route = createFileRoute("/settings/after-download/")({
  beforeLoad: settingsGuard({ adminOnly: true }),
  component: AfterDownloadPage,
});
