import { useState } from "react";
import { useTranslation } from "react-i18next";
import {
  dailyCronAt,
  describeCron,
  detectReleaseCheckPreset,
  isValidCron,
  releaseCheckCronFor,
} from "@rawkoon/shared/utils";
import { cronLocale } from "@/lib/utils/cron";

type PresetKind =
  | "hourly"
  | "every3h"
  | "every6h"
  | "every12h"
  | "daily"
  | "custom";

const PRESETS: PresetKind[] = [
  "hourly",
  "every3h",
  "every6h",
  "every12h",
  "daily",
  "custom",
];

export interface ReleaseCheckValue {
  cron: string;
  valid: boolean;
}

interface ReleaseCheckFieldsetProps {
  initialCron: string;
  onChange: (value: ReleaseCheckValue) => void;
}

const INPUT_CLASS =
  "focus-ring rounded-lg border border-neutral-700 bg-neutral-900 px-3 py-1.5 text-sm text-neutral-100";

export function ReleaseCheckFieldset({
  initialCron,
  onChange,
}: ReleaseCheckFieldsetProps) {
  const { t, i18n } = useTranslation("common");
  const locale = cronLocale(i18n.language);
  const initial = detectReleaseCheckPreset(initialCron);
  const [kind, setKind] = useState<PresetKind>(initial.kind);
  const [time, setTime] = useState(
    initial.kind === "daily" ? initial.time : "03:00",
  );
  const [custom, setCustom] = useState(initialCron);

  const resolve = (
    nextKind: PresetKind,
    nextTime: string,
    nextCustom: string,
  ): ReleaseCheckValue => {
    if (nextKind === "daily") {
      const cron = dailyCronAt(nextTime);
      return { cron: cron ?? "", valid: cron !== null };
    }
    if (nextKind === "custom") {
      const cron = nextCustom.trim().replace(/\s+/g, " ");
      return { cron, valid: isValidCron(cron) };
    }
    return { cron: releaseCheckCronFor({ kind: nextKind }), valid: true };
  };

  const current = resolve(kind, time, custom);

  const update = (
    nextKind: PresetKind,
    nextTime: string,
    nextCustom: string,
  ) => {
    setKind(nextKind);
    setTime(nextTime);
    setCustom(nextCustom);
    onChange(resolve(nextKind, nextTime, nextCustom));
  };

  const customInvalid = kind === "custom" && !current.valid;
  const dailyInvalid = kind === "daily" && !current.valid;

  return (
    <fieldset className="rounded-lg border border-neutral-700/60 bg-neutral-900/40 p-4">
      <legend className="px-1 text-sm font-medium text-neutral-300">
        {t("settings.mediaLibrary.releaseCheck.title")}
      </legend>
      <p className="mb-3 text-xs text-neutral-400">
        {t("settings.mediaLibrary.releaseCheck.description")}
      </p>
      <div className="space-y-2">
        {PRESETS.map((value) => (
          <div key={value}>
            <label className="flex flex-wrap items-center gap-x-2 gap-y-1.5 text-sm text-neutral-200">
              <input
                type="radio"
                name="release-check-preset"
                value={value}
                checked={kind === value}
                onChange={() => update(value, time, custom)}
              />
              <span>
                {t(`settings.mediaLibrary.releaseCheck.presets.${value}`)}
              </span>
              {value === "every6h" && (
                <span className="rounded-full bg-neutral-700/60 px-2 py-0.5 text-xs text-neutral-300">
                  {t("settings.mediaLibrary.releaseCheck.defaultTag")}
                </span>
              )}
              {value === "daily" && (
                <input
                  type="time"
                  aria-label={t("settings.mediaLibrary.releaseCheck.timeLabel")}
                  value={time}
                  onFocus={() =>
                    kind !== "daily" && update("daily", time, custom)
                  }
                  onChange={(e) => update("daily", e.target.value, custom)}
                  className={INPUT_CLASS}
                />
              )}
            </label>
            {value === "custom" && kind === "custom" && (
              <div className="mt-2 pl-6">
                <input
                  type="text"
                  aria-label={t(
                    "settings.mediaLibrary.releaseCheck.customLabel",
                  )}
                  aria-invalid={customInvalid}
                  value={custom}
                  onChange={(e) => update("custom", time, e.target.value)}
                  placeholder="0 */4 * * *"
                  spellCheck={false}
                  autoCapitalize="off"
                  className={`${INPUT_CLASS} w-full max-w-xs font-mono ${customInvalid ? "border-red-500/70" : ""}`}
                />
                <p className="mt-1 text-xs text-neutral-400">
                  {t("settings.mediaLibrary.releaseCheck.customHint")}
                </p>
              </div>
            )}
          </div>
        ))}
      </div>

      {customInvalid || dailyInvalid ? (
        <p role="alert" className="mt-3 text-sm text-red-400">
          {customInvalid
            ? t("settings.mediaLibrary.releaseCheck.invalidCron")
            : t("settings.mediaLibrary.releaseCheck.invalidTime")}
        </p>
      ) : (
        <p className="mt-3 text-sm text-neutral-300">
          {t("settings.mediaLibrary.releaseCheck.summary", {
            schedule: describeCron(current.cron, locale),
          })}
        </p>
      )}
      {(kind === "daily" || kind === "custom") && (
        <p className="mt-1 text-xs text-neutral-400">
          {t("settings.mediaLibrary.releaseCheck.timezoneHint")}
        </p>
      )}
    </fieldset>
  );
}
