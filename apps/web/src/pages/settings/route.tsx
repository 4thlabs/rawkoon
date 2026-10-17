import { createFileRoute } from "@tanstack/react-router";
import { SettingsLayout } from "@/pages/settings/_component/SettingsLayout";

export const Route = createFileRoute("/settings")({
  component: SettingsLayout,
});
