import { useState } from "react";
import { useTranslation } from "react-i18next";
import { SegmentedTabs } from "@/components/ui/segmented-tabs";
import { CustomFormatsTab } from "@/pages/settings/_component/CustomFormatsTab";
import { QualityProfilesTab } from "@/pages/settings/_component/QualityProfilesTab";
import { SettingsPageShell } from "@/pages/settings/_component/SettingsPageShell";

type View = "profiles" | "formats";

export function QualityPage() {
  const { t } = useTranslation("common");
  const [view, setView] = useState<View>("profiles");
  return (
    <SettingsPageShell id="quality">
      <SegmentedTabs
        items={[
          {
            id: "profiles" as const,
            label: t("settings.media.tabs.qualityProfiles"),
          },
          {
            id: "formats" as const,
            label: t("settings.media.tabs.customFormats"),
          },
        ]}
        value={view}
        onChange={setView}
      />
      {view === "profiles" ? <QualityProfilesTab /> : <CustomFormatsTab />}
    </SettingsPageShell>
  );
}
