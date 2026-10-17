import { useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import {
  Gauge,
  MoreHorizontal,
  RefreshCw,
  Search,
  SlidersHorizontal,
  X,
} from "lucide-react";
import type { LibraryMedia } from "@rawkoon/shared/types";
import { ActionMenu, type ActionMenuEntry } from "@/components/ui/action-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { ReencodeModal } from "@/features/transcode/ReencodeModal";
import { useRescanLibraryItem } from "@/features/medias/hooks/useRescanLibraryItem";
import { useToggleMediaMonitored } from "@/features/medias/hooks/useToggleMediaMonitored";
import { useUpdateLibraryQualityProfile } from "@/features/medias/hooks/useUpdateLibraryQualityProfile";
import { useUpgradeLibraryMedia } from "@/features/medias/hooks/useUpgradeLibraryMedia";
import { useQualityProfilesList } from "@/pages/settings/useQualityProfiles";
import { LibraryRemoveDialog } from "./LibraryRemoveDialog";
import { LibraryUpgradeModal } from "./LibraryUpgradeModal";

const NO_PROFILE = "none";

interface LibraryControlStripProps {
  item: LibraryMedia;
  onEditDetails: () => void;
  onSearchReleases: () => void;
  onUpgradeManualSearch: () => void;
  onRemoved: () => void;
}

/** Monitored, quality profile and the ⋯ menu: the title page's admin controls, visible from every tab. */
export function LibraryControlStrip({
  item,
  onEditDetails,
  onSearchReleases,
  onUpgradeManualSearch,
  onRemoved,
}: LibraryControlStripProps) {
  const { t } = useTranslation("common");
  const toggleMonitored = useToggleMediaMonitored();
  const updateProfile = useUpdateLibraryQualityProfile();
  const upgradeMedia = useUpgradeLibraryMedia();
  const rescan = useRescanLibraryItem(item.id);
  const { data: profilesData } = useQualityProfilesList({
    staleTime: 0,
    gcTime: 0,
  });
  const profiles = profilesData?.profiles ?? [];

  const [upgradeModalOpen, setUpgradeModalOpen] = useState(false);
  const [upgradeEpisodes, setUpgradeEpisodes] = useState<number | undefined>();
  const [reencodeOpen, setReencodeOpen] = useState(false);
  const [removeOpen, setRemoveOpen] = useState(false);

  const changeProfile = (value: string) => {
    const qid = value === NO_PROFILE ? null : parseInt(value, 10);
    void updateProfile
      .mutateAsync({ id: item.id, body: { quality_profile_id: qid } })
      .then((result) => {
        if (result.item.needs_upgrade) {
          setUpgradeEpisodes(result.item.affected_episodes);
          setUpgradeModalOpen(true);
        } else {
          toast.success(t("library.strip.profileUpdated"));
        }
      })
      .catch(() => toast.error(t("library.strip.profileUpdateFailed")));
  };

  const autoUpgrade = async () => {
    try {
      await upgradeMedia.mutateAsync({ id: item.id, mode: "auto" });
      toast.success(t("medias.library.upgradeModal.autoSearchStarted"));
    } catch {
      toast.error(t("medias.library.upgradeModal.autoSearchFailed"));
    } finally {
      setUpgradeModalOpen(false);
    }
  };

  const rescanFiles = () => {
    rescan.mutate(undefined, {
      onSuccess: (result) =>
        toast.success(
          t("library.strip.rescanDone", { count: result.rescanned }),
        ),
      onError: () => toast.error(t("library.strip.rescanFailed")),
    });
  };

  const items: ActionMenuEntry[] = [
    {
      id: "edit",
      label: t("library.strip.editDetails"),
      icon: <SlidersHorizontal size={15} />,
      onSelect: onEditDetails,
    },
    {
      id: "rescan",
      label: t("library.strip.rescan"),
      icon: <RefreshCw size={15} />,
      disabled: rescan.isPending,
      onSelect: rescanFiles,
    },
    {
      id: "reencode",
      label: t("library.strip.reencode"),
      icon: <Gauge size={15} />,
      onSelect: () => setReencodeOpen(true),
    },
    {
      id: "releases",
      label: t("library.strip.searchReleases"),
      icon: <Search size={15} />,
      hint: t("medias.detail.tabReleases"),
      onSelect: onSearchReleases,
    },
    "separator",
    {
      id: "remove",
      label: t("library.strip.remove"),
      icon: <X size={15} />,
      destructive: true,
      onSelect: () => setRemoveOpen(true),
    },
  ];

  const profileValue =
    item.quality_profile_id == null
      ? NO_PROFILE
      : String(item.quality_profile_id);
  const segment =
    "flex min-h-11 items-center gap-3 rounded-xl border border-white/15 bg-black/35 px-3.5 backdrop-blur-sm sm:rounded-none sm:border-0 sm:bg-transparent sm:backdrop-blur-none";

  return (
    <>
      <div className="flex w-full flex-col gap-2 sm:inline-flex sm:w-auto sm:flex-row sm:items-stretch sm:gap-0 sm:overflow-hidden sm:rounded-xl sm:border sm:border-white/15 sm:bg-black/35 sm:backdrop-blur-sm">
        <div className="flex gap-2 sm:contents">
          <label className={`${segment} flex-1 cursor-pointer sm:flex-none`}>
            <span
              aria-hidden
              className={`size-2 rounded-full ${item.monitored ? "bg-primary-400" : "bg-neutral-500"}`}
            />
            <span className="text-sm font-medium text-neutral-100">
              {t("library.strip.monitored")}
            </span>
            <Switch
              checked={item.monitored}
              disabled={toggleMonitored.isPending}
              aria-label={t("library.strip.monitored")}
              className="ml-auto sm:ml-1"
              onCheckedChange={(monitored) => {
                void toggleMonitored
                  .mutateAsync({ id: item.id, monitored })
                  .catch(() => toast.error(t("library.strip.monitorFailed")));
              }}
            />
          </label>
          <ActionMenu
            label={t("library.strip.moreActions")}
            items={items}
            trigger={
              <button
                type="button"
                aria-label={t("library.strip.moreActions")}
                className={`${segment} focus-ring justify-center text-neutral-200 transition-colors hover:bg-white/10 sm:border-l sm:border-white/15 sm:px-3`}
              >
                <MoreHorizontal size={18} aria-hidden />
              </button>
            }
          />
        </div>

        <div className={`${segment} sm:min-w-0 sm:border-l sm:border-white/15`}>
          <span className="shrink-0 text-sm text-neutral-400">
            {t("library.strip.profile")}
          </span>
          <Select
            value={profileValue}
            onValueChange={changeProfile}
            disabled={updateProfile.isPending}
          >
            <SelectTrigger
              aria-label={t("library.strip.profile")}
              className="h-9 min-w-0 flex-1 gap-2 border-0 border-l-0 bg-transparent px-1 text-sm font-medium focus-visible:border-l-0 sm:w-auto sm:flex-none sm:max-w-[16rem]"
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={NO_PROFILE}>
                {t("library.strip.profileNone")}
              </SelectItem>
              {profiles.map((p) => (
                <SelectItem key={p.id} value={String(p.id)}>
                  {p.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <LibraryUpgradeModal
        open={upgradeModalOpen}
        mediaType={item.type}
        affectedEpisodes={upgradeEpisodes}
        onAutoSearch={() => void autoUpgrade()}
        onManualSearch={() => {
          setUpgradeModalOpen(false);
          onUpgradeManualSearch();
        }}
        onDismiss={() => setUpgradeModalOpen(false)}
        isLoading={upgradeMedia.isPending}
      />
      {reencodeOpen && (
        <ReencodeModal
          isOpen
          onClose={() => setReencodeOpen(false)}
          selection={{ media_id: item.id }}
          subtitle={item.title}
        />
      )}
      <LibraryRemoveDialog
        open={removeOpen}
        libraryId={item.id}
        title={item.title}
        onClose={() => setRemoveOpen(false)}
        onRemoved={onRemoved}
      />
    </>
  );
}
