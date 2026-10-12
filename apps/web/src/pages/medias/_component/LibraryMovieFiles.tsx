import type { useTranslation } from "react-i18next";
import { Trash2 } from "lucide-react";
import type { LibraryFileInfo } from "@rawkoon/shared/types";
import type { useDeleteLibraryFile } from "@/features/medias/hooks/useDeleteLibraryFile";
import { cn } from "@/lib/utils";
import { Badge } from "./LibrarySharedUI";
import { qualityBadges } from "@/utils/libraryDisplayUtils";
import { FileDetailBlock } from "./LibraryFileDetailBlock";

interface LibraryMovieFilesProps {
  files: LibraryFileInfo[];
  deleteConfirmId: number | null;
  setDeleteConfirmId: (id: number | null) => void;
  deleteFile: ReturnType<typeof useDeleteLibraryFile>;
  t: ReturnType<typeof useTranslation>["t"];
}

export function LibraryMovieFiles({
  files,
  deleteConfirmId,
  setDeleteConfirmId,
  deleteFile,
  t,
}: LibraryMovieFilesProps) {
  return (
    <div className="px-4 py-3 space-y-4">
      {files.map((file, fileIdx) => {
        const badges = qualityBadges(file);
        const isConfirming = deleteConfirmId === file.id;
        return (
          <div
            key={file.id}
            className={cn(
              files.length > 1 &&
                "border-t border-border pt-4 first:border-none first:pt-0",
            )}
          >
            {files.length > 1 && (
              <p className="text-xs font-semibold text-neutral-500 mb-2">
                {t("library.media.fileLabel")} {fileIdx + 1}
              </p>
            )}
            <div className="flex items-center gap-1 flex-wrap mb-3">
              {badges.map((b) => (
                <Badge key={b.label} className={b.cls}>
                  {b.label}
                </Badge>
              ))}
              {isConfirming ? (
                <div className="flex items-center gap-1.5 ml-1">
                  <span className="text-[10px] text-neutral-400">
                    {t("library.media.deleteFileOnDisk")}
                  </span>
                  <button
                    type="button"
                    disabled={deleteFile.isPending}
                    onClick={() => {
                      deleteFile.mutate(
                        { fileId: file.id, deleteFile: true },
                        { onSettled: () => setDeleteConfirmId(null) },
                      );
                    }}
                    className="rounded px-2 py-0.5 text-xs font-medium bg-rose-600 text-white hover:bg-rose-500 disabled:opacity-50 transition-colors"
                  >
                    {t("library.media.yesDelete")}
                  </button>
                  <button
                    type="button"
                    disabled={deleteFile.isPending}
                    onClick={() => {
                      deleteFile.mutate(
                        { fileId: file.id, deleteFile: false },
                        { onSettled: () => setDeleteConfirmId(null) },
                      );
                    }}
                    className="rounded px-2 py-0.5 text-xs font-medium bg-neutral-700 text-neutral-300 hover:bg-neutral-600 disabled:opacity-50 transition-colors"
                  >
                    {t("library.media.keepFile")}
                  </button>
                  <button
                    type="button"
                    onClick={() => setDeleteConfirmId(null)}
                    className="text-xs text-neutral-400 hover:text-neutral-300 transition-colors"
                  >
                    {t("common.cancel")}
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setDeleteConfirmId(file.id)}
                  className="inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-xs text-neutral-400 hover:text-red-500 hover:bg-red-950/30 transition-colors ml-1"
                >
                  <Trash2 size={10} />
                  {t("common.remove")}
                </button>
              )}
            </div>
            <FileDetailBlock file={file} />
          </div>
        );
      })}
    </div>
  );
}
