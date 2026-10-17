import type { ReactNode } from "react";
import * as RadixDialog from "@radix-ui/react-dialog";
import { useTranslation } from "react-i18next";
import { RotateCcw, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface EditPanelProps {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  saveLabel: string;
  saving?: boolean;
  /** Save is disabled until something changed. */
  canSave?: boolean;
  onSave: () => void;
  children: ReactNode;
}

/** A side panel from 640px up and a full-height sheet below, with one Save. */
export function EditPanel({
  open,
  onClose,
  title,
  description,
  saveLabel,
  saving = false,
  canSave = true,
  onSave,
  children,
}: EditPanelProps) {
  const { t } = useTranslation("common");
  return (
    <RadixDialog.Root
      open={open}
      onOpenChange={(next) => {
        if (!next) onClose();
      }}
    >
      <RadixDialog.Portal>
        <RadixDialog.Overlay className="fixed inset-0 z-[var(--z-modal-backdrop)] bg-black/50 data-[state=open]:animate-in data-[state=open]:fade-in-0 motion-reduce:animate-none" />
        <RadixDialog.Content
          aria-describedby={undefined}
          className={cn(
            "fixed inset-0 z-[var(--z-modal)] flex flex-col bg-neutral-900 text-neutral-100 outline-none",
            "sm:left-auto sm:w-[30rem] sm:border-l sm:border-neutral-700 sm:shadow-2xl",
            "data-[state=open]:animate-in data-[state=open]:slide-in-from-bottom sm:data-[state=open]:slide-in-from-right motion-reduce:animate-none",
          )}
        >
          <div className="flex shrink-0 items-start gap-3 border-b border-neutral-800 px-5 pb-4 pt-[max(1.25rem,env(safe-area-inset-top,0px))]">
            <div className="min-w-0 flex-1">
              <RadixDialog.Title className="font-display text-xl font-semibold text-neutral-50">
                {title}
              </RadixDialog.Title>
              {description && (
                <p className="mt-1 text-sm text-neutral-400">{description}</p>
              )}
            </div>
            <RadixDialog.Close
              aria-label={t("common.close")}
              className="focus-ring -mr-1.5 rounded-full p-1.5 text-neutral-400 transition-colors hover:bg-neutral-800 hover:text-neutral-200"
            >
              <X size={18} />
            </RadixDialog.Close>
          </div>

          <div className="min-h-0 flex-1 space-y-7 overflow-y-auto overscroll-contain px-5 py-5">
            {children}
          </div>

          <div className="flex shrink-0 items-center justify-end gap-2 border-t border-neutral-800 px-5 py-4 pb-[max(1rem,env(safe-area-inset-bottom,0px))]">
            <Button type="button" variant="ghost" onClick={onClose}>
              {t("common.cancel")}
            </Button>
            <Button
              type="button"
              disabled={saving || !canSave}
              onClick={onSave}
            >
              {saveLabel}
            </Button>
          </div>
        </RadixDialog.Content>
      </RadixDialog.Portal>
    </RadixDialog.Root>
  );
}

/** A titled group inside an EditPanel. */
export function EditGroup({
  title,
  aside,
  children,
}: {
  title: string;
  aside?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="space-y-3">
      <div className="flex items-baseline justify-between gap-3">
        <h3 className="font-sans text-sm font-semibold text-neutral-100">
          {title}
        </h3>
        {aside && <span className="text-xs text-neutral-400">{aside}</span>}
      </div>
      {children}
    </section>
  );
}

/** Label row for a field that can override a source value: "Overridden" plus a reset link. */
export function OverrideLabel({
  htmlFor,
  label,
  overridden,
  resetLabel,
  onReset,
}: {
  htmlFor: string;
  label: string;
  overridden: boolean;
  resetLabel: string;
  onReset: () => void;
}) {
  const { t } = useTranslation("common");
  return (
    <div className="flex min-h-6 items-center gap-2">
      <label htmlFor={htmlFor} className="text-sm font-medium text-neutral-300">
        {label}
      </label>
      {overridden && (
        <>
          <span className="inline-flex items-center gap-1.5 text-xs text-primary-300">
            <span
              aria-hidden
              className="size-1.5 rounded-full bg-primary-400"
            />
            {t("editPanel.overridden")}
          </span>
          <button
            type="button"
            onClick={onReset}
            className="focus-ring ml-auto inline-flex items-center gap-1 rounded px-1 text-xs text-neutral-400 transition-colors hover:text-neutral-100"
          >
            <RotateCcw size={11} aria-hidden />
            {resetLabel}
          </button>
        </>
      )}
    </div>
  );
}
