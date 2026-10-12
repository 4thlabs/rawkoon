import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "@tanstack/react-router";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useDeleteBook } from "../_hooks/useBooks";

/**
 * Remove-from-library control, matching the media pages: a red text button that
 * swaps into an inline confirm panel. window.confirm() was used here before —
 * it is suppressed in an installed PWA, which is why deleting a book looked
 * like it did nothing on mobile.
 */
export function RemoveBookAction({
  bookId,
  title,
}: {
  bookId: number;
  title: string;
}) {
  const { t } = useTranslation("common");
  const navigate = useNavigate();
  const deleteBook = useDeleteBook();
  const [confirming, setConfirming] = useState(false);

  if (confirming) {
    return (
      <div className="w-full rounded-lg border border-red-800/60 bg-red-950/10 p-3 sm:w-64">
        <p className="text-xs text-red-300">
          {t("books.detail.removeConfirm", { title })}
        </p>
        <div className="mt-3 flex gap-2">
          <Button
            type="button"
            variant="destructive"
            size="sm"
            disabled={deleteBook.isPending}
            onClick={async () => {
              try {
                await deleteBook.mutateAsync(bookId);
                toast.success(t("books.detail.removed", { title }));
                // Leave before the detail query refetches, otherwise the page
                // flashes its "not in the library" empty state.
                void navigate({ to: "/books" });
              } catch {
                toast.error(t("books.detail.removeFailed"));
              }
            }}
            className="gap-1.5"
          >
            <Trash2 className="h-3.5 w-3.5" />
            {deleteBook.isPending
              ? t("books.detail.removing")
              : t("books.detail.removeConfirmAction")}
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setConfirming(false)}
          >
            {t("common.cancel")}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={() => setConfirming(true)}
      className="focus-ring inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium text-red-400 transition-colors hover:bg-red-950/30"
    >
      <Trash2 className="h-3.5 w-3.5" />
      {t("books.detail.remove")}
    </button>
  );
}
