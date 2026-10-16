import { useTranslation } from "react-i18next";
import { useUpdateProfile } from "@/pages/settings/useUsers";

const languages = [
  { code: "en", name: "English" },
  { code: "fr", name: "Français" },
];

/** Flips between the supported UI languages and saves the choice to the profile. */
export function useLanguageToggle() {
  const { i18n } = useTranslation("common");
  const updateProfile = useUpdateProfile();
  const current =
    languages.find((l) => l.code === i18n.language) ?? languages[0];

  const toggle = () => {
    const next =
      languages.find((l) => l.code !== i18n.language) ?? languages[0];
    i18n.changeLanguage(next.code);
    updateProfile.mutate(
      { locale: next.code },
      {
        onError: (error) => {
          console.debug("Failed to update locale on server:", error);
        },
      },
    );
  };

  return { currentName: current.name, toggle };
}
