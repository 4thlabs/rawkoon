import { ReleasesTab } from "@/pages/settings/_component/ReleasesTab";
import { SettingsPageShell } from "@/pages/settings/_component/SettingsPageShell";

export function UpdatesPage() {
  return (
    <SettingsPageShell id="updates">
      <ReleasesTab />
    </SettingsPageShell>
  );
}
