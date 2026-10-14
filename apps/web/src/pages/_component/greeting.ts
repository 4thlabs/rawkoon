// Mirrors RawkoonKit's HomeGreeting so web and iOS greet the same way at the same hour.

export type GreetingPeriod = "morning" | "afternoon" | "evening" | "night";

export type GreetingSubtitle =
  | "night"
  | "weekend"
  | "monday"
  | "friday"
  | "earlyMorning"
  | "morning"
  | "afternoon"
  | "evening";

export function greetingPeriod(hour: number): GreetingPeriod {
  if (hour >= 5 && hour < 12) return "morning";
  if (hour >= 12 && hour < 18) return "afternoon";
  if (hour >= 18 && hour < 23) return "evening";
  return "night";
}

/** `weekday` is JS `Date.getDay()`: 0 = Sunday … 6 = Saturday. */
export function greetingSubtitle(
  hour: number,
  weekday: number,
): GreetingSubtitle {
  const period = greetingPeriod(hour);
  // Late night wins over the day flavour: 2am Saturday is a night, not a weekend.
  if (period === "night") return "night";
  if (weekday === 0 || weekday === 6) return "weekend";
  if (weekday === 1) return "monday";
  if (weekday === 5) return "friday";
  // 5h-8h is still dark for most people: "overnight" would read as night talk.
  if (hour >= 5 && hour < 8) return "earlyMorning";
  return period;
}
