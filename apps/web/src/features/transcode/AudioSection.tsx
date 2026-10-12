import { useTranslation } from "react-i18next";
import type {
  TranscodeEstimate,
  TranscodeJobSettings,
} from "@rawkoon/shared/types";
import { Switch } from "@/components/ui/switch";
import { Section } from "@/features/transcode/ReencodeLayout";

export function AudioSection({
  s,
  set,
  est,
}: {
  s: TranscodeJobSettings;
  set: <K extends keyof TranscodeJobSettings>(
    k: K,
    v: TranscodeJobSettings[K],
  ) => void;
  est: TranscodeEstimate | undefined;
}) {
  const { t } = useTranslation("common");
  return (
    <Section title={t("transcode.sections.audio")}>
      <label className="flex cursor-pointer items-start gap-2.5">
        <Switch
          checked={s.convertLosslessAudio}
          onCheckedChange={(v: boolean) => set("convertLosslessAudio", v)}
          aria-label={t("transcode.convertAudio")}
        />
        <span>
          <span className="block font-medium text-neutral-50">
            {t("transcode.convertAudio")}
          </span>
          <span className="block text-xs text-neutral-500">
            {t("transcode.convertAudioHint")}
          </span>
        </span>
      </label>
      <div className="ml-11 mt-2 grid gap-1">
        {est?.audio_changes.length ? (
          est.audio_changes.map((a) => (
            <div
              key={a.label}
              className="flex justify-between text-xs text-neutral-400"
            >
              <span>{a.label}</span>
              <span>
                {s.convertLosslessAudio ? (
                  <>
                    <span className="text-primary-400">→</span> {a.to}
                  </>
                ) : (
                  t("transcode.copy")
                )}
              </span>
            </div>
          ))
        ) : (
          <span className="text-xs text-neutral-500">
            {t("transcode.noLossless")}
          </span>
        )}
      </div>
    </Section>
  );
}
