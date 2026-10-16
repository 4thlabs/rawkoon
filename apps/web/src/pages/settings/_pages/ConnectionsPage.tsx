import { useTranslation } from "react-i18next";
import { AdvancedDisclosure } from "@/components/ui/advanced-disclosure";
import { SettingsPageShell } from "@/pages/settings/_component/SettingsPageShell";
import { DownloadClientHookSection } from "@/pages/settings/_component/integrations/DownloadClientHookSection";
import { DownloadClientIntegrationSection } from "@/pages/settings/_component/integrations/DownloadClientIntegrationSection";
import { FanartIntegrationSection } from "@/pages/settings/_component/integrations/FanartIntegrationSection";
import { IndexersCard } from "@/pages/settings/_component/integrations/IndexersCard";
import { JellyfinIntegrationSection } from "@/pages/settings/_component/integrations/JellyfinIntegrationSection";
import { TmdbIntegrationSection } from "@/pages/settings/_component/integrations/TmdbIntegrationSection";

export function ConnectionsPage() {
  const { t } = useTranslation("common");
  return (
    <SettingsPageShell id="connections">
      <div className="space-y-3">
        <TmdbIntegrationSection />
        <FanartIntegrationSection />
        <JellyfinIntegrationSection />
      </div>
      <IndexersCard />
      <div className="space-y-3">
        <DownloadClientIntegrationSection />
        <AdvancedDisclosure label={t("settings.connections.hookAdvanced")}>
          <DownloadClientHookSection />
        </AdvancedDisclosure>
      </div>
    </SettingsPageShell>
  );
}
