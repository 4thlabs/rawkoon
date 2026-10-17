import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Trash2 } from "lucide-react";
import { Dialog } from "@/components/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { useLibraryDownloads } from "@/features/medias/hooks/useLibraryDownloads";
import { useRemoveFromLibrary } from "@/features/medias/hooks/useRemoveFromLibrary";
import { useSeeding } from "@/features/seeding/hooks/useSeeding";
import { formatBytes } from "@/lib/utils/format";

interface LibraryRemoveDialogProps {
  open: boolean;
  libraryId: number;
  title: string;
  onClose: () => void;
  onRemoved: () => void;
}

export function LibraryRemoveDialog({
  open,
  libraryId,
  title,
  onClose,
  onRemoved,
}: LibraryRemoveDialogProps) {
  const { t } = useTranslation("common");
  const removeMutation = useRemoveFromLibrary();
  const [deleteFiles, setDeleteFiles] = useState(true);
  const [releaseNow, setReleaseNow] = useState(false);

  const { data: downloads } = useLibraryDownloads(open ? libraryId : null);
  const heldHashes = new Set(
    (downloads?.items ?? [])
      .filter((i) => i.seed?.state === "seeding" && i.torrent_hash)
      .map((i) => (i.torrent_hash as string).toLowerCase()),
  );
  const { data: seeding } = useSeeding({
    enabled: open && heldHashes.size > 0,
  });
  const heldTorrents = (seeding?.torrents ?? []).filter((s) =>
    heldHashes.has(s.hash),
  );
  const owesSeedTime = heldTorrents.some((s) => s.owes_seed_time);
  const heldBytes = heldTorrents.reduce((sum, s) => sum + s.size_bytes, 0);
  const single = heldTorrents.length === 1 ? heldTorrents[0] : null;
  const keepHint =
    single && !single.target_met && single.rule.ratio != null
      ? t("library.remove.keepSeedingHintRatio", {
          ratio: (single.ratio ?? 0).toFixed(2),
          target: single.rule.ratio.toFixed(1),
        })
      : t("library.remove.keepSeedingHint");
  const releaseHint =
    heldBytes > 0
      ? t("library.remove.releaseNowHintSize", { size: formatBytes(heldBytes) })
      : t("library.remove.releaseNowHint");

  const seedChoices = [
    {
      value: false,
      label: t("library.remove.keepSeeding"),
      hint: keepHint,
    },
    {
      value: true,
      label: t("library.remove.releaseNow"),
      hint: releaseHint,
    },
  ];

  const remove = async () => {
    try {
      await removeMutation.mutateAsync({
        id: libraryId,
        deleteFiles,
        releaseTorrents: releaseNow && heldHashes.size > 0,
      });
      onRemoved();
    } catch {
      // The mutation hook reports the failure.
    }
  };

  return (
    <Dialog
      isOpen={open}
      onClose={onClose}
      title={t("library.remove.title")}
      panelClassName="max-w-md"
    >
      <div className="space-y-4">
        <p className="text-sm text-neutral-300">
          {t("library.remove.description", { title })}
        </p>

        <label className="flex cursor-pointer items-center gap-2.5 text-sm text-neutral-200">
          <Checkbox
            checked={deleteFiles}
            onChange={(e) => setDeleteFiles(e.target.checked)}
          />
          {t("library.remove.deleteFilesLabel")}
        </label>

        {heldHashes.size > 0 && (
          <fieldset className="space-y-2.5 rounded-lg border border-neutral-700 p-3">
            <legend className="px-1 text-xs text-neutral-300">
              {t("library.remove.seedingTitle", { count: heldHashes.size })}
            </legend>
            {seedChoices.map((choice) => (
              <label
                key={String(choice.value)}
                className="flex cursor-pointer items-start gap-2.5 text-sm text-neutral-200"
              >
                <input
                  type="radio"
                  name={`release-${libraryId}`}
                  className="mt-1 accent-primary-500"
                  checked={releaseNow === choice.value}
                  onChange={() => setReleaseNow(choice.value)}
                  aria-label={choice.label}
                />
                <span>
                  <span className="block font-medium">{choice.label}</span>
                  <span className="text-xs text-neutral-400">
                    {choice.hint}
                  </span>
                </span>
              </label>
            ))}
            {releaseNow && owesSeedTime && (
              <p className="rounded-md border border-amber-900/70 bg-amber-950/40 px-2.5 py-2 text-xs text-amber-200">
                {t("library.remove.hnrWarning")}
              </p>
            )}
          </fieldset>
        )}

        <div className="flex justify-end gap-2 pt-1">
          <Button type="button" variant="ghost" onClick={onClose}>
            {t("common.cancel")}
          </Button>
          <Button
            type="button"
            variant="destructive"
            disabled={removeMutation.isPending}
            onClick={() => void remove()}
            className="gap-1.5"
          >
            <Trash2 size={14} aria-hidden />
            {removeMutation.isPending
              ? t("library.remove.removing")
              : t("library.remove.confirm")}
          </Button>
        </div>
      </div>
    </Dialog>
  );
}
