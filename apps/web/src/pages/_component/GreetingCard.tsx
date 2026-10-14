import { useTranslation } from "react-i18next";
import { landedEpisodeCode } from "@rawkoon/shared/utils";
import { greetingPeriod, greetingSubtitle } from "@/pages/_component/greeting";
import {
  useFreshLanded,
  useMinuteClock,
} from "@/features/medias/hooks/useLandedArrivals";
import { useRecentlyAdded } from "@/pages/_component/useRecentlyAdded";

interface GreetingCardProps {
  /** Empty when the name isn't known yet; the greeting then stands alone. */
  userName: string;
}

export function GreetingCard({ userName }: GreetingCardProps) {
  const { t } = useTranslation("common");
  const now = useMinuteClock();
  const hour = now.getHours();
  const greeting = t(`dashboard.greeting.${greetingPeriod(hour)}`);
  const landed = useFreshLanded(now)[0];
  const { data: recent } = useRecentlyAdded();
  // Same cached query as the rail: its row carries the user's title language.
  const landedTitle =
    recent?.find((m) => m.id === landed?.mediaId)?.title ?? landed?.title;
  const code = landed ? landedEpisodeCode(landed.season, landed.episode) : "";
  // A fresh arrival outranks the time-of-day line.
  const subtitle = landed
    ? t(
        code ? "dashboard.landed.subtitle" : "dashboard.landed.subtitleNoCode",
        { title: landedTitle, code },
      )
    : t(`dashboard.greetingSubtitle.${greetingSubtitle(hour, now.getDay())}`);

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
