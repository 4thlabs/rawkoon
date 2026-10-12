import { useTranslation } from "react-i18next";
import type {
  TranscodeCapabilities,
  TranscodeCodec,
  TranscodeEncoder,
  TranscodeJobSettings,
  TranscodeResolution,
} from "@rawkoon/shared/types";
import { Row, Section } from "@/features/transcode/ReencodeLayout";
import { Segmented } from "@/features/transcode/Segmented";

export function VideoSection({
  s,
  setS,
  set,
  has,
  gpuAvailable,
  caps,
  sourceHeight,
  fits,
}: {
  s: TranscodeJobSettings;
  setS: React.Dispatch<React.SetStateAction<TranscodeJobSettings>>;
  set: <K extends keyof TranscodeJobSettings>(
    k: K,
    v: TranscodeJobSettings[K],
  ) => void;
  has: (codec: TranscodeCodec, encoder: TranscodeEncoder) => boolean;
  gpuAvailable: boolean;
  caps: { data?: TranscodeCapabilities };
  sourceHeight: number | null;
  fits: (bw: number, bh: number) => boolean;
}) {
  const { t } = useTranslation("common");
  return (
    <Section title={t("transcode.sections.video")}>
      <Row label={t("transcode.codec")}>
        <Segmented<TranscodeCodec>
          ariaLabel={t("transcode.codec")}
          value={s.codec}
          onChange={(v) =>
            setS((p) => ({
              ...p,
              codec: v,
              encoder: has(v, p.encoder) ? p.encoder : "software",
            }))
          }
          options={[
            {
              value: "hevc",
              label: "HEVC",
              hint: t("transcode.codecHevcHint"),
              disabled: !has("hevc", "software") && !has("hevc", "vaapi"),
            },
            {
              value: "av1",
              label: "AV1",
              hint: t("transcode.codecAv1Hint"),
              disabled: !has("av1", "software") && !has("av1", "vaapi"),
            },
          ]}
        />
      </Row>
      <Row label={t("transcode.encoder")}>
        <Segmented<TranscodeEncoder>
          ariaLabel={t("transcode.encoder")}
          value={s.encoder}
          onChange={(v) => set("encoder", v)}
          options={[
            {
              value: "software",
              label: t("transcode.encoderCpu"),
              hint: t("transcode.encoderCpuHint"),
              disabled: !has(s.codec, "software"),
            },
            {
              value: "vaapi",
              label: t("transcode.encoderGpu"),
              hint: t("transcode.encoderGpuHint"),
              disabled: !gpuAvailable,
              title: caps.data?.vaapi_unavailable_reason ?? undefined,
            },
          ]}
        />
        <p className="mt-1 text-xs text-neutral-500">
          {caps.data?.device_label
            ? t("transcode.detected", { label: caps.data.device_label })
            : caps.data?.vaapi_unavailable_reason}
        </p>
      </Row>
      <Row label={t("transcode.resolution")}>
        <Segmented<TranscodeResolution>
          ariaLabel={t("transcode.resolution")}
          value={s.resolution}
          onChange={(v) => set("resolution", v)}
          options={[
            {
              value: "keep",
              label: t("transcode.resKeep"),
              hint: sourceHeight ? `${sourceHeight}p` : undefined,
            },
            {
              value: 1080,
              label: "1080p",
              disabled: fits(1920, 1080),
            },
            {
              value: 720,
              label: "720p",
              disabled: fits(1280, 720),
            },
          ]}
        />
      </Row>
    </Section>
  );
}
