import { useTranslation } from "react-i18next";
import type {
  TranscodeJobSettings,
  TranscodeMode,
  TranscodePreset,
  TranscodeSpeed,
} from "@rawkoon/shared/types";
import { derivedMbps } from "@/features/transcode/format";
import { Row, Section } from "@/features/transcode/ReencodeLayout";
import { Segmented } from "@/features/transcode/Segmented";

export function SizeSection({
  s,
  setS,
  set,
  gbPerFile,
  setGbPerFile,
  effective,
}: {
  s: TranscodeJobSettings;
  setS: React.Dispatch<React.SetStateAction<TranscodeJobSettings>>;
  set: <K extends keyof TranscodeJobSettings>(
    k: K,
    v: TranscodeJobSettings[K],
  ) => void;
  gbPerFile: number;
  setGbPerFile: (v: number) => void;
  effective: TranscodeJobSettings;
}) {
  const { t } = useTranslation("common");
  return (
    <Section title={t("transcode.sections.size")}>
      <Row label={t("transcode.mode")}>
        <Segmented<TranscodeMode>
          ariaLabel={t("transcode.mode")}
          value={s.mode}
          onChange={(v) => set("mode", v)}
          options={[
            {
              value: "quality",
              label: t("transcode.modeQuality"),
              hint: t("transcode.modeQualityHint"),
            },
            {
              value: "target",
              label: t("transcode.modeTarget"),
              hint: t("transcode.modeTargetHint"),
            },
          ]}
        />
      </Row>
      {s.mode === "quality" ? (
        <>
          <Row label={t("transcode.preset")}>
            <Segmented<TranscodePreset>
              ariaLabel={t("transcode.preset")}
              value={s.preset}
              onChange={(v) =>
                setS((p) => ({ ...p, preset: v, quality: undefined }))
              }
              options={[
                { value: "high", label: t("transcode.presetHigh") },
                {
                  value: "balanced",
                  label: t("transcode.presetBalanced"),
                },
                { value: "small", label: t("transcode.presetSmall") },
              ]}
            />
          </Row>
          <details className="mt-1.5">
            <summary className="cursor-pointer text-[13px] text-neutral-400">
              {t("transcode.advanced")}
            </summary>
            <Row label={t("transcode.qualityValue")}>
              <input
                type="number"
                aria-label={t("transcode.qualityValue")}
                value={s.quality ?? ""}
                min={0}
                max={255}
                onChange={(e) =>
                  set(
                    "quality",
                    e.target.value === "" ? undefined : Number(e.target.value),
                  )
                }
                className="w-24 rounded-lg border border-neutral-800 bg-neutral-950 px-2.5 py-1.5 text-neutral-50"
              />
              <span className="ml-2 font-mono text-xs text-neutral-400">
                {s.encoder === "vaapi"
                  ? t("transcode.qualityValueHintQp")
                  : t("transcode.qualityValueHintCrf")}
              </span>
            </Row>
            {s.encoder === "software" && (
              <Row label={t("transcode.speed")}>
                <Segmented<TranscodeSpeed>
                  ariaLabel={t("transcode.speed")}
                  value={s.speed}
                  onChange={(v) => set("speed", v)}
                  options={[
                    {
                      value: "slower",
                      label: t("transcode.speedSlower"),
                    },
                    {
                      value: "default",
                      label: t("transcode.speedDefault"),
                    },
                    {
                      value: "faster",
                      label: t("transcode.speedFaster"),
                    },
                  ]}
                />
              </Row>
            )}
          </details>
        </>
      ) : (
        <Row label={t("transcode.perFile")}>
          <label className="flex items-center gap-2">
            <input
              type="number"
              step={0.1}
              min={0.1}
              value={gbPerFile}
              onChange={(e) => setGbPerFile(Number(e.target.value) || 0.1)}
              className="w-24 rounded-lg border border-neutral-800 bg-neutral-950 px-2.5 py-1.5 text-neutral-50"
            />
            <span className="text-[13px] text-neutral-400">
              {t("transcode.gbPerFile")}
            </span>
          </label>
          {effective.targetVideoKbps != null && (
            <p className="mt-1 text-xs text-neutral-500">
              {t("transcode.derived", {
                mbps: derivedMbps(effective.targetVideoKbps),
              })}
            </p>
          )}
        </Row>
      )}
    </Section>
  );
}
