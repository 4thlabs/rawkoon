import { AiProviderIntegrationSection } from "@/pages/settings/_component/integrations/AiProviderIntegrationSection";
import { SettingsPageShell } from "@/pages/settings/_component/SettingsPageShell";

/** Provider configuration only; usage and the call log live under System. */
export function AiPage() {
  return (
    <SettingsPageShell id="ai">
      <AiProviderIntegrationSection />
    </SettingsPageShell>
  );
}
