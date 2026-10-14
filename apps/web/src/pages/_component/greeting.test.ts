import { describe, expect, it } from "vitest";
import { greetingPeriod, greetingSubtitle } from "@/pages/_component/greeting";
import en from "@/locales/en/common.json";
import fr from "@/locales/fr/common.json";

// Same table as RawkoonKit's HomeGreetingTests; change both together.
describe("greetingPeriod", () => {
  it.each([
    [4, "night"],
    [5, "morning"],
    [11, "morning"],
    [12, "afternoon"],
    [17, "afternoon"],
    [18, "evening"],
    [22, "evening"],
    [23, "night"],
    [0, "night"],
  ] as const)("hour %i is %s", (hour, period) => {
    expect(greetingPeriod(hour)).toBe(period);
  });
});

describe("greetingSubtitle", () => {
  const SUN = 0;
  const MON = 1;
  const WED = 3;
  const FRI = 5;
  const SAT = 6;

  it("lets late night win over the weekend", () => {
    expect(greetingSubtitle(2, SAT)).toBe("night");
  });

  it("flavours weekend, Monday and Friday days", () => {
    expect(greetingSubtitle(10, SAT)).toBe("weekend");
    expect(greetingSubtitle(15, SUN)).toBe("weekend");
    expect(greetingSubtitle(9, MON)).toBe("monday");
    expect(greetingSubtitle(19, FRI)).toBe("friday");
  });

  it("falls back to the period midweek", () => {
    expect(greetingSubtitle(8, WED)).toBe("morning");
    expect(greetingSubtitle(14, WED)).toBe("afternoon");
    expect(greetingSubtitle(20, WED)).toBe("evening");
  });
});

describe("greeting locale keys", () => {
  const periods = ["morning", "afternoon", "evening", "night"] as const;
  const subtitles = [
    "night",
    "weekend",
    "monday",
    "friday",
    "morning",
    "afternoon",
    "evening",
  ] as const;

  it.each([
    ["en", en],
    ["fr", fr],
  ])("%s has every greeting and subtitle", (_, locale) => {
    for (const p of periods) expect(locale.dashboard.greeting[p]).toBeTruthy();
    for (const s of subtitles)
      expect(locale.dashboard.greetingSubtitle[s]).toBeTruthy();
  });
});
