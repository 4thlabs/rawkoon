import { useTranslation } from "react-i18next";
import type { TranscodeQueueSettings } from "@rawkoon/shared/types";
import type { useUpdateTranscodeSettings } from "@/features/transcode/hooks";

export function TranscodeAdvancedSettings({
  settings,
  update,
}: {
  settings: TranscodeQueueSettings;
  update: ReturnType<typeof useUpdateTranscodeSettings>;
}) {
  const { t } = useTranslation("common");

  return (
    <details className="text-sm text-neutral-400">
      <summary className="cursor-pointer">
        {t("transcode.admin.advanced")}
      </summary>
      <div className="mt-2 grid max-w-md gap-2">
        {(
          [
            ["ssim_threshold", t("transcode.admin.ssimThreshold"), 0.001],
            ["ssim_clip_min", t("transcode.admin.ssimClipMin"), 0.001],
          ] as const
        ).map(([k, label, step]) => (
          <label key={k} className="flex items-center justify-between gap-3">
            {label}
            <input
              type="number"
              step={step}
              min={0.5}
              max={1}
              defaultValue={settings[k]}
              onBlur={(e) => update.mutate({ [k]: Number(e.target.value) })}
              className="w-24 rounded-lg border border-neutral-800 bg-neutral-950 px-2 py-1 text-neutral-50"
            />
          </label>
        ))}
        <label className="flex items-center justify-between gap-3">
          {t("transcode.admin.cpuThreads")}
          <input
            type="number"
            min={1}
            defaultValue={settings.cpu_threads ?? ""}
            onBlur={(e) =>
              update.mutate({
                cpu_threads:
                  e.target.value === "" ? null : Number(e.target.value),
              })
            }
            className="w-24 rounded-lg border border-neutral-800 bg-neutral-950 px-2 py-1 text-neutral-50"
          />
        </label>
      </div>
    </details>
  );
}
