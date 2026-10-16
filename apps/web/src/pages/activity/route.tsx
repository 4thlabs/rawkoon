import { createFileRoute, Outlet } from "@tanstack/react-router";
import { ActivityLanes } from "@/pages/activity/_component/ActivityLanes";

export const Route = createFileRoute("/activity")({
  component: ActivityLayout,
});

function ActivityLayout() {
  return (
    <div className="flex flex-1 flex-col">
      <ActivityLanes />
      <Outlet />
    </div>
  );
}
