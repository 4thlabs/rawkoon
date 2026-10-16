import { describe, expect, it } from "bun:test";
import {
  DEFAULT_RELEASE_CHECK_CRON,
  dailyCronAt,
  describeCron,
  detectReleaseCheckPreset,
  isValidCron,
  normalizeCron,
  releaseCheckCronFor,
} from "../cron";

describe("normalizeCron", () => {
  it("collapses whitespace", () => {
    expect(normalizeCron("  0   */4 * *  * ")).toBe("0 */4 * * *");
  });

  it("returns null for an invalid expression", () => {
    expect(normalizeCron("0 */4 * *")).toBeNull();
    expect(normalizeCron("")).toBeNull();
  });
});

describe("isValidCron", () => {
  it.each([
    "* * * * *",
    "0 */6 * * *",
    "*/15 * * * *",
    "7-59/15 * * * *",
    "30 4 1,15 * *",
    "0 9 * * MON-FRI",
    "0 0 1 JAN *",
    "0 3 * * 7",
    "  0   3 * * *  ",
  ])("accepts %s", (expr) => {
    expect(isValidCron(expr)).toBe(true);
  });

  it.each([
    "",
    "   ",
    "* * * *",
    "* * * * * *",
    "60 * * * *",
    "* 24 * * *",
    "* * 0 * *",
    "* * 32 * *",
    "* * * 13 *",
    "* * * * 8",
    "*/0 * * * *",
    "5-1 * * * *",
    "a * * * *",
    "1,,2 * * * *",
    "*/x * * * *",
    "1/2/3 * * * *",
    "1-2-3 * * * *",
    "0 9 * * FOO",
  ])("rejects %j", (expr) => {
    expect(isValidCron(expr)).toBe(false);
  });
});

describe("describeCron (en)", () => {
  const en = (e: string) => describeCron(e, "en");
  it.each([
    ["* * * * *", "every minute"],
    ["*/5 * * * *", "every 5 minutes"],
    ["*/20 * * * * *", "every 20 seconds"],
    ["7-59/15 * * * *", "every 15 minutes, starting at minute 7"],
    ["1-59/5 * * * *", "every 5 minutes, starting at minute 1"],
    ["0 * * * *", "every hour"],
    ["20 * * * *", "every hour, at minute 20"],
    ["0 */3 * * *", "every 3 hours"],
    ["0 */6 * * *", "every 6 hours"],
    ["40 */6 * * *", "every 6 hours, at minute 40"],
    ["30 */12 * * *", "every 12 hours, at minute 30"],
    ["0 0 * * *", "every day at 12:00 AM"],
    ["50 4 * * *", "every day at 4:50 AM"],
    ["0 12 * * *", "every day at 12:00 PM"],
    ["15 18 * * *", "every day at 6:15 PM"],
    ["0 3,15 * * *", "every day at 3:00 AM and 3:00 PM"],
    ["0 3 * * 0", "every Sunday at 3:00 AM"],
    ["0 3 * * 7", "every Sunday at 3:00 AM"],
    ["0 9 * * 1,3", "every Monday and Wednesday at 9:00 AM"],
    ["0 9 * * 1-5", "every weekday at 9:00 AM"],
    ["0 9 * * MON-FRI", "every weekday at 9:00 AM"],
    ["0 9 * * 1-3", "every Monday to Wednesday at 9:00 AM"],
    ["0 9 * * 6,0", "every Saturday and Sunday at 9:00 AM"],
    ["0 0 1 * *", "on the 1st of each month at 12:00 AM"],
    ["30 8 15 * *", "on the 15th of each month at 8:30 AM"],
    ["0 8 1,15 * *", "on the 1st and 15th of each month at 8:00 AM"],
    ["0 8 22 * *", "on the 22nd of each month at 8:00 AM"],
    ["0 8 23 * *", "on the 23rd of each month at 8:00 AM"],
    ["0 8 11 * *", "on the 11th of each month at 8:00 AM"],
  ])("%s", (expr, words) => {
    expect(en(expr)).toBe(words);
  });

  it("falls back to the raw expression", () => {
    expect(en("0 9 * 6 *")).toBe("0 9 * 6 *");
    expect(en("0 9 1 * 1")).toBe("0 9 1 * 1");
    expect(en("*/7 * * * *")).toBe("*/7 * * * *");
    expect(en("0 */5 * * *")).toBe("0 */5 * * *");
    expect(en("0-30/5 * * * *")).toBe("0-30/5 * * * *");
    expect(en("0 9-17 * * *")).toBe("0 9-17 * * *");
    expect(en("not a cron")).toBe("not a cron");
    expect(en("")).toBe("");
    expect(en("*/7 * * * * *")).toBe("*/7 * * * * *");
  });
});

describe("describeCron (fr)", () => {
  const fr = (e: string) => describeCron(e, "fr");
  it.each([
    ["* * * * *", "chaque minute"],
    ["*/5 * * * *", "toutes les 5 minutes"],
    ["*/20 * * * * *", "toutes les 20 secondes"],
    ["7-59/15 * * * *", "toutes les 15 minutes, à partir de la minute 7"],
    ["0 * * * *", "chaque heure"],
    ["20 * * * *", "chaque heure, à la minute 20"],
    ["0 */6 * * *", "toutes les 6 heures"],
    ["40 */6 * * *", "toutes les 6 heures, à la minute 40"],
    ["50 4 * * *", "chaque jour à 4 h 50"],
    ["0 0 * * *", "chaque jour à 0 h 00"],
    ["0 3,15 * * *", "chaque jour à 3 h 00 et 15 h 00"],
    ["0 3 * * 0", "chaque dimanche à 3 h 00"],
    ["0 9 * * 1,3", "chaque lundi et mercredi à 9 h 00"],
    ["0 9 * * 1-5", "chaque jour de semaine à 9 h 00"],
    ["0 9 * * 1-3", "du lundi au mercredi à 9 h 00"],
    ["0 0 1 * *", "le 1er de chaque mois à 0 h 00"],
    ["0 8 1,15 * *", "le 1er et 15 de chaque mois à 8 h 00"],
  ])("%s", (expr, words) => {
    expect(fr(expr)).toBe(words);
  });

  it("falls back to the raw expression", () => {
    expect(fr("0 9 * 6 *")).toBe("0 9 * 6 *");
  });
});

describe("release check presets", () => {
  it("defaults to every 6 hours", () => {
    expect(DEFAULT_RELEASE_CHECK_CRON).toBe("0 */6 * * *");
    expect(detectReleaseCheckPreset(DEFAULT_RELEASE_CHECK_CRON)).toEqual({
      kind: "every6h",
    });
  });

  it("round-trips every preset", () => {
    for (const kind of ["hourly", "every3h", "every6h", "every12h"] as const) {
      const cron = releaseCheckCronFor({ kind });
      expect(isValidCron(cron)).toBe(true);
      expect(detectReleaseCheckPreset(cron)).toEqual({ kind });
    }
  });

  it("builds and detects a daily time", () => {
    expect(dailyCronAt("04:05")).toBe("5 4 * * *");
    expect(dailyCronAt("0:00")).toBe("0 0 * * *");
    expect(detectReleaseCheckPreset("5 4 * * *")).toEqual({
      kind: "daily",
      time: "04:05",
    });
  });

  it("rejects malformed times", () => {
    expect(dailyCronAt("")).toBeNull();
    expect(dailyCronAt("24:00")).toBeNull();
    expect(dailyCronAt("12:60")).toBeNull();
    expect(dailyCronAt("noon")).toBeNull();
  });

  it("treats anything else as custom", () => {
    expect(detectReleaseCheckPreset("*/10 * * * *")).toEqual({
      kind: "custom",
    });
    expect(detectReleaseCheckPreset("0 3 * * 1")).toEqual({ kind: "custom" });
    expect(detectReleaseCheckPreset("99 99 * * *")).toEqual({ kind: "custom" });
  });
});
