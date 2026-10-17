import { SettingsPageShell } from "@/pages/settings/_component/SettingsPageShell";
import { TranscodeTab } from "@/pages/settings/_component/TranscodeTab";

export function ReencodePage() {
  return (
    <SettingsPageShell id="reencode">
      <TranscodeTab />
    </SettingsPageShell>
  );
}
