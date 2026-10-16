import { useState } from "react";
import { useTranslation } from "react-i18next";
import { SegmentedTabs } from "@/components/ui/segmented-tabs";
import { ApiKeysTab } from "@/pages/settings/_component/ApiKeysTab";
import { OidcProvidersTab } from "@/pages/settings/_component/OidcProvidersTab";
import { SessionsTab } from "@/pages/settings/_component/SessionsTab";
import { SettingsPageShell } from "@/pages/settings/_component/SettingsPageShell";
import { UsersTab } from "@/pages/settings/_component/UsersTab";

type View = "users" | "sso" | "api-keys" | "sessions";

export function PeoplePage() {
  const { t } = useTranslation("common");
  const [view, setView] = useState<View>("users");
  return (
    <SettingsPageShell id="people">
      <SegmentedTabs
        items={[
          { id: "users" as const, label: t("settings.users.title") },
          {
            id: "sso" as const,
            label: t("settings.integrations.sso.title"),
          },
          { id: "api-keys" as const, label: t("settings.apiKeys.title") },
          { id: "sessions" as const, label: t("settings.sessions.title") },
        ]}
        value={view}
        onChange={setView}
      />
      {view === "users" && <UsersTab />}
      {view === "sso" && <OidcProvidersTab />}
      {view === "api-keys" && <ApiKeysTab />}
      {view === "sessions" && <SessionsTab />}
    </SettingsPageShell>
  );
}
