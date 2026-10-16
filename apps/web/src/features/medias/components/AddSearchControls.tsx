import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { useTranslation } from "react-i18next";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";

/** Small caption telling the admin that Add will also look for a release. */
export function AddSearchCaption({ className }: { className?: string }) {
  const { t } = useTranslation("common");
  return (
    <p className={cn("text-[11px] text-neutral-400", className)}>
      {t("medias.addSearch.caption")}
    </p>
  );
}

/** Caret beside an Add button: a menu with "Add only", which skips the search for this add. */
export function AddOnlyMenu({
  onAddOnly,
  disabled,
  className,
}: {
  onAddOnly: () => void;
  disabled?: boolean;
  className?: string;
}) {
  const { t } = useTranslation("common");
  const [open, setOpen] = useState(false);
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          disabled={disabled}
          aria-label={t("medias.addSearch.moreOptions")}
          className={cn(
            "focus-ring inline-flex items-center justify-center disabled:opacity-50",
            className,
          )}
        >
          <ChevronDown size={14} />
        </button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-auto p-1">
        <button
          type="button"
          onClick={() => {
            setOpen(false);
            onAddOnly();
          }}
          className="focus-ring block w-full whitespace-nowrap rounded px-3 py-2 text-left text-sm text-neutral-100 hover:bg-neutral-700"
        >
          {t("medias.addSearch.addOnly")}
        </button>
      </PopoverContent>
    </Popover>
  );
}
