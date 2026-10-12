import { useTranslation } from "react-i18next";
import { Check } from "lucide-react";
import type { BookEdition } from "@rawkoon/shared";
import { stepsFor } from "./acquisitionSteps";

export function AcquisitionTrack({ edition }: { edition: BookEdition }) {
  const { t } = useTranslation("common");
  const steps = stepsFor(edition);
  return (
    <ol className="flex items-center gap-0" aria-label={t("books.track.label")}>
      {steps.map((step, i) => (
        <li key={step.key} className="flex items-center">
          {i > 0 && (
            <span
              aria-hidden
              className={`h-px w-8 sm:w-12 ${
                step.reached ? "bg-primary-500/60" : "bg-neutral-700"
              }`}
            />
          )}
          <span className="flex items-center gap-1.5 px-1.5">
            <span
              aria-hidden
              className={`grid h-4 w-4 place-items-center rounded-full border transition-colors ${
                step.reached
                  ? "border-primary-500 bg-primary-500/20"
                  : "border-neutral-700 bg-transparent"
              }`}
            >
              {step.reached && (
                <Check className="h-2.5 w-2.5 text-primary-300" />
              )}
            </span>
            <span
              className={`text-xs ${
                step.active
                  ? "font-medium text-neutral-100"
                  : step.reached
                    ? "text-neutral-400"
                    : "text-neutral-500"
              }`}
            >
              {t(step.labelKey)}
            </span>
          </span>
        </li>
      ))}
    </ol>
  );
}
