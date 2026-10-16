import { useTranslation } from "react-i18next";
import { Loader } from "@/components/Loader";
import { AdvancedDisclosure } from "@/components/ui/advanced-disclosure";
import { useMediaPostProcessingSettings } from "@/features/medias/hooks/useMediaPostProcessingSettings";
import { DownloadSafetySection } from "@/pages/settings/_component/DownloadSafetySection";
import { SeedingTab } from "@/pages/settings/_component/SeedingTab";
import { SettingsPageShell } from "@/pages/settings/_component/SettingsPageShell";

export function AfterDownloadPage() {
  const { t } = useTranslation("common");
  const { data, isLoading } = useMediaPostProcessingSettings();
  const settings = data?.settings;

  return (
    <SettingsPageShell id="after-download">
      <SeedingTab />
      {isLoading && <Loader size="md" />}
      {settings && (
        <AdvancedDisclosure label={t("settings.afterDownload.safety")}>
          {/* Not keyed on updated_at: a save here must not reset unsaved seeding edits. */}
          <DownloadSafetySection settings={settings} />
        </AdvancedDisclosure>
      )}
    </SettingsPageShell>
  );
}
