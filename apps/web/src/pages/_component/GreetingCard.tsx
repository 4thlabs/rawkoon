import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { greetingPeriod, greetingSubtitle } from "@/pages/_component/greeting";

interface GreetingCardProps {
  /** Empty when the name isn't known yet; the greeting then stands alone. */
  userName: string;
}

/** Re-renders once a minute so a tab left open overnight doesn't keep saying "Good morning". */
function useMinuteClock(): Date {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(id);
  }, []);
  return now;
}

export function GreetingCard({ userName }: GreetingCardProps) {
  const { t } = useTranslation("common");
  const now = useMinuteClock();
  const hour = now.getHours();
  const greeting = t(`dashboard.greeting.${greetingPeriod(hour)}`);
  const subtitle = t(
    `dashboard.greetingSubtitle.${greetingSubtitle(hour, now.getDay())}`,
  );

  return (
    <div className="relative">
      <h1 className="text-lg md:text-xl font-bold tracking-tight text-neutral-50">
        {userName ? `${greeting}, ${userName}` : greeting}
      </h1>
      <p className="mt-0.5 text-xs text-neutral-400 leading-relaxed">
        {subtitle}
      </p>
    </div>
  );
}
