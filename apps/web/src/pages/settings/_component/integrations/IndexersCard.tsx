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
    stored === "jackett" || stored === "prowlarr" ? stored : fallback;
  const enabledOf = (m: Manager) =>
    Boolean((m === "jackett" ? jackett : prowlarr)?.integration?.enabled);
  // The chips choose which manager's form is shown; only an enabled one is made active.
  const shown: Manager = picked ?? active;
  const pending = update.isPending;

  const activate = async (m: Manager) => {
    try {
      await update.mutateAsync({ active_indexer_manager: m });
      setPicked(null);
    } catch {
      setPicked(null);
      toast.error(t("settings.connections.indexers.switchError"));
    }
  };

  const choose = async (next: Manager) => {
    if (next === shown || pending) return;
    if (!enabledOf(next)) {
      setPicked(next);
      return;
    }
    setPicked(next);
    await activate(next);
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
          value={shown}
          onChange={(next) => void choose(next)}
          disabled={pending}
        />
      </div>
      {shown !== active && !enabledOf(shown) && (
        <p className="px-1 text-xs text-amber-300">
          {t("settings.connections.indexers.saveToActivate", {
            manager: shown === "jackett" ? "Jackett" : "Prowlarr",
          })}
        </p>
      )}
      {shown === "prowlarr" ? (
        <ProwlarrIntegrationSection
          onSaved={(enabled) => enabled && void activate("prowlarr")}
        />
      ) : (
        <JackettIntegrationSection
          onSaved={(enabled) => enabled && void activate("jackett")}
        />
      )}
    </section>
  );
}
