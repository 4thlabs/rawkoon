import type { CronLocale } from "@rawkoon/shared/utils";

export function cronLocale(language: string | undefined): CronLocale {
  return language?.startsWith("fr") ? "fr" : "en";
}
