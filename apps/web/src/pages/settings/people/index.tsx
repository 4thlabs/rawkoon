import { createFileRoute } from "@tanstack/react-router";
import { settingsGuard } from "@/pages/settings/_lib/settingsGuard";
import {
  PeoplePage,
  type PeopleView,
} from "@/pages/settings/_pages/PeoplePage";

const VIEWS: PeopleView[] = ["users", "sso", "api-keys", "sessions"];

export const Route = createFileRoute("/settings/people/")({
  validateSearch: (search: Record<string, unknown>): { view?: PeopleView } => ({
    view: VIEWS.includes(search.view as PeopleView)
      ? (search.view as PeopleView)
      : undefined,
  }),
  beforeLoad: settingsGuard({ adminOnly: true }),
  component: PeoplePage,
});
