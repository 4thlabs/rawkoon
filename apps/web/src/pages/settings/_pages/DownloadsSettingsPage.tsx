import { useNavigate, useSearch } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { SegmentedTabs } from "@/components/ui/segmented-tabs";
import { DownloadsImportView } from "@/features/downloadsImport/DownloadsImportPage";
import { OrphansView } from "@/features/seeding/components/OrphansView";
import { SeedingView } from "@/features/seeding/components/SeedingView";
import { useOrphans } from "@/features/seeding/hooks/useOrphans";
import { useSeeding } from "@/features/seeding/hooks/useSeeding";
import { LibraryHistoryTab } from "@/pages/medias/_component/LibraryHistoryTab";
import { ArrLibraryImportPanel } from "@/pages/settings/_component/ArrLibraryImportPanel";
import { SettingsPageShell } from "@/pages/settings/_component/SettingsPageShell";

export type DownloadsView =
  | "import"
  | "seeding"
  | "orphans"
  | "history"
  | "arr";

/** Everything about what the download client holds: staging, seeding, leftovers, history, and the Radarr/Sonarr import. */
export function DownloadsSettingsPage() {
  const { t } = useTranslation("common");
  const navigate = useNavigate();
  const { view = "import" } = useSearch({ from: "/settings/downloads/" });
  const seeding = useSeeding();
  const orphans = useOrphans();
  const orphanCount = orphans.data?.orphans.length ?? 0;

  return (
    <SettingsPageShell id="downloads">
      <SegmentedTabs
        items={[
          { id: "import" as const, label: t("downloadsPage.tabs.import") },
          {
            id: "seeding" as const,
            label: t("downloadsPage.tabs.seeding"),
            badge: seeding.data?.torrents.length,
          },
          {
            id: "orphans" as const,
            label: t("downloadsPage.tabs.orphans"),
            badge: orphanCount > 0 ? orphanCount : undefined,
          },
          { id: "history" as const, label: t("downloadsPage.tabs.history") },
          { id: "arr" as const, label: t("downloadsPage.tabs.arr") },
        ]}
        value={view}
        onChange={(next) =>
          navigate({
            to: "/settings/downloads",
            search: { view: next === "import" ? undefined : next },
          })
        }
        ariaLabel={t("settings.pages.downloads.title")}
      />
      <div>
        {view === "import" && <DownloadsImportView />}
        {view === "seeding" && <SeedingView />}
        {view === "orphans" && <OrphansView />}
        {view === "history" && <LibraryHistoryTab />}
        {view === "arr" && <ArrLibraryImportPanel />}
      </div>
    </SettingsPageShell>
  );
}
