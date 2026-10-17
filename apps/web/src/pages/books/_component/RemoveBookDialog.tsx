import { useTranslation } from "react-i18next";
import { useNavigate } from "@tanstack/react-router";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Dialog } from "@/components/dialog";
import { Button } from "@/components/ui/button";
import { useDeleteBook } from "../_hooks/useBooks";

/**
 * Remove-from-library confirmation. window.confirm() was used before; it is
 * suppressed in an installed PWA, which made deleting look like a no-op on mobile.
 */
export function RemoveBookDialog({
  open,
  onClose,
  bookId,
  title,
}: {
  open: boolean;
  onClose: () => void;
  bookId: number;
  title: string;
}) {
  const { t } = useTranslation("common");
  const navigate = useNavigate();
  const deleteBook = useDeleteBook();

  return (
    <Dialog
      isOpen={open}
      onClose={onClose}
      title={t("books.detail.removeTitle")}
      panelClassName="max-w-md"
    >
      <div className="space-y-4">
        <p className="text-sm text-neutral-300">
          {t("books.detail.removeConfirm", { title })}
        </p>
        <div className="flex justify-end gap-2">
          <Button type="button" variant="ghost" onClick={onClose}>
            {t("common.cancel")}
          </Button>
          <Button
            type="button"
            variant="destructive"
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
        </div>
      </div>
    </Dialog>
  );
}
