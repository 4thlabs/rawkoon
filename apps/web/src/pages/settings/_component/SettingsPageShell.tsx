import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { SettingsPageHeader } from "./SettingsPageHeader";

/** The page title and description for one settings page, from its registry id. */
export function SettingsPageShell({
  id,
  actions,
  children,
}: {
  id: string;
  actions?: ReactNode;
  children: ReactNode;
}) {
  const { t } = useTranslation("common");
  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <SettingsPageHeader
        title={t(`settings.pages.${id}.title`)}
        description={t(`settings.pages.${id}.description`)}
        actions={actions}
      />
      {children}
    </div>
  );
}
