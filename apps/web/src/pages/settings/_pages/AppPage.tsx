import { Languages, Monitor } from "lucide-react";
import { useTranslation } from "react-i18next";
import { NavPositionPicker } from "@/components/NavPositionPicker";
import { useLanguageToggle } from "@/lib/app/useLanguageToggle";
import { SettingsPageShell } from "@/pages/settings/_component/SettingsPageShell";
import { useNavPosition } from "@/pages/settings/useNavPosition";

export function AppPage() {
  const { t } = useTranslation("common");
  const { position, setPosition } = useNavPosition();
  const language = useLanguageToggle();

  return (
    <SettingsPageShell id="app">
      <div className="rounded-xl border border-neutral-700 bg-neutral-800 p-6">
        <div className="mb-2 flex items-center gap-2">
          <Languages size={16} className="text-neutral-500" />
          <h3 className="text-sm font-semibold text-neutral-100">
            {t("common.language")}
          </h3>
        </div>
        <p className="mb-4 text-sm text-neutral-400">
          {t("settings.app.languageHint")}
        </p>
        <button
          type="button"
          onClick={language.toggle}
          className="focus-ring rounded-lg border border-neutral-600 bg-neutral-700 px-4 py-2 text-sm font-medium text-neutral-100 hover:bg-neutral-600"
        >
          {language.currentName}
        </button>
      </div>
      <div className="rounded-xl border border-neutral-700 bg-neutral-800 p-6">
        <div className="mb-2 flex items-center gap-2">
          <Monitor size={16} className="text-neutral-500" />
          <h3 className="text-sm font-semibold text-neutral-100">
            {t("settings.app.navigation")}
          </h3>
        </div>
        <p className="mb-4 text-sm text-neutral-400">
          {t("settings.app.navigationHint")}
        </p>
        <NavPositionPicker value={position} onChange={setPosition} />
      </div>
    </SettingsPageShell>
  );
}
