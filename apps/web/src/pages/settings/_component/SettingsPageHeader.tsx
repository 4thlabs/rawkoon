import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";

interface SettingsPageHeaderProps {
  actions?: ReactNode;
  description?: ReactNode;
  icon?: LucideIcon;
  /** Omit for an actions-only row under the page title. */
  title?: ReactNode;
  /** A page title is h2; a titled block inside a page is h3. */
  level?: "page" | "section";
}

export function SettingsPageHeader({
  actions,
  description,
  title,
  level = "page",
}: SettingsPageHeaderProps) {
  const Heading = level === "page" ? "h2" : "h3";
  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
      {title != null && (
        <div className="min-w-0">
          <Heading
            className={
              level === "page"
                ? "break-words text-xl font-semibold tracking-tight text-neutral-100"
                : "break-words text-base font-semibold text-neutral-100"
            }
          >
            {title}
          </Heading>
          {description && (
            <p className="mt-1 max-w-2xl break-words text-sm text-neutral-400">
              {description}
            </p>
          )}
        </div>
      )}
      {actions && <div className="shrink-0 sm:ml-auto">{actions}</div>}
    </div>
  );
}
