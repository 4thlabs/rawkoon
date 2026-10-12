import type { TranscodeJob, TranscodeStep } from "@rawkoon/shared/types";

export const STEPS: TranscodeStep[] = [
  "encode",
  "validate",
  "replace",
  "rescan",
];

export function settingsLabel(j: TranscodeJob): string {
  const s = j.settings;
  const parts = [s.codec.toUpperCase(), s.encoder === "vaapi" ? "GPU" : "CPU"];
  if (s.resolution !== "keep") parts.push(`→${s.resolution}p`);
  parts.push(
    s.mode === "target"
      ? `${((s.targetVideoKbps ?? 0) / 1000).toFixed(1)} Mbps`
      : s.preset,
  );
  if (s.convertLosslessAudio) parts.push("EAC3");
  return parts.join(" · ");
}

export function groupBatches(
  queued: TranscodeJob[],
): { batchId: string; jobs: TranscodeJob[] }[] {
  const out: { batchId: string; jobs: TranscodeJob[] }[] = [];
  for (const j of queued) {
    const last = out[out.length - 1];
    if (last?.batchId === j.batch_id) last.jobs.push(j);
    else out.push({ batchId: j.batch_id, jobs: [j] });
  }
  return out;
}
