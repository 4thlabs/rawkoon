import { GeneralSettingsTab } from "@/pages/settings/_component/GeneralSettingsTab";
import { SettingsPageShell } from "@/pages/settings/_component/SettingsPageShell";

export function GeneralPage() {
  return (
    <SettingsPageShell id="general">
      <GeneralSettingsTab />
    </SettingsPageShell>
  );
}
