import { NotificationsTab } from "@/pages/settings/_component/NotificationsTab";
import { SettingsPageShell } from "@/pages/settings/_component/SettingsPageShell";

export function AlertsPage() {
  return (
    <SettingsPageShell id="alerts">
      <NotificationsTab />
    </SettingsPageShell>
  );
}
