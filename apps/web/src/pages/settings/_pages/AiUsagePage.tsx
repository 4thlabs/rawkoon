import { AiCallHistory } from "@/pages/settings/_component/ai/AiCallHistory";
import { AiStatsPanel } from "@/pages/settings/_component/ai/AiStatsPanel";
import { SettingsPageShell } from "@/pages/settings/_component/SettingsPageShell";

export function AiUsagePage() {
  return (
    <SettingsPageShell id="ai-usage">
      <AiStatsPanel />
      <AiCallHistory />
    </SettingsPageShell>
  );
}
