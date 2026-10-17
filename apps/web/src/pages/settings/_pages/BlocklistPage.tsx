import { BlocklistTab } from "@/pages/settings/_component/BlocklistTab";
import { SettingsPageShell } from "@/pages/settings/_component/SettingsPageShell";

export function BlocklistPage() {
  return (
    <SettingsPageShell id="blocklist">
      <BlocklistTab />
    </SettingsPageShell>
  );
}
