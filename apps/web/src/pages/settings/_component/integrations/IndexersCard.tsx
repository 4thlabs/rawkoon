import { useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { SegmentedTabs } from "@/components/ui/segmented-tabs";
import { useMediaPostProcessingSettings } from "@/features/medias/hooks/useMediaPostProcessingSettings";
import { useUpdateMediaPostProcessingSettings } from "@/features/medias/hooks/useUpdateMediaPostProcessingSettings";
import { useJackettIntegration } from "@/pages/settings/useJackettIntegration";
import { useProwlarrIntegration } from "@/pages/settings/useProwlarrIntegration";
import { JackettIntegrationSection } from "./JackettIntegrationSection";
import { ProwlarrIntegrationSection } from "./ProwlarrIntegrationSection";

type Manager = "prowlarr" | "jackett";

/**
 * One Indexers card: the Prowlarr | Jackett switch sets the active indexer
 * manager, and the card shows that manager's fields and RSS indexer picker.
 */
export function IndexersCard() {
  const { t } = useTranslation("common");
  const { data: media } = useMediaPostProcessingSettings();
  const { data: prowlarr } = useProwlarrIntegration();
  const { data: jackett } = useJackettIntegration();
  const update = useUpdateMediaPostProcessingSettings();
  const [picked, setPicked] = useState<Manager | null>(null);

  const stored = media?.settings.active_indexer_manager;
  const fallback: Manager =
    !prowlarr?.integration?.enabled && jackett?.integration?.enabled
      ? "jackett"
      : "prowlarr";
  const active: Manager =
    picked ??
    (stored === "jackett" || stored === "prowlarr" ? stored : fallback);

  const choose = async (next: Manager) => {
    if (next === active) return;
    setPicked(next);
    try {
      await update.mutateAsync({ active_indexer_manager: next });
    } catch {
      setPicked(null);
      toast.error(t("settings.connections.indexers.switchError"));
    }
  };

  return (
    <section className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-3 px-1">
        <div>
          <h3 className="text-xs font-semibold uppercase tracking-wider text-neutral-500">
            {t("settings.connections.indexers.title")}
          </h3>
          <p className="mt-1 text-sm text-neutral-400">
            {t("settings.connections.indexers.help")}
          </p>
        </div>
        <SegmentedTabs
          variant="chips"
          ariaLabel={t("settings.connections.indexers.switchLabel")}
          items={[
            { id: "prowlarr" as const, label: "Prowlarr" },
            { id: "jackett" as const, label: "Jackett" },
          ]}
          value={active}
          onChange={(next) => void choose(next)}
        />
      </div>
      {active === "prowlarr" ? (
        <ProwlarrIntegrationSection />
      ) : (
        <JackettIntegrationSection />
      )}
    </section>
  );
}
