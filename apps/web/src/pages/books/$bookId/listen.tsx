import { createFileRoute, redirect } from "@tanstack/react-router";
import { getCurrentUser } from "@/lib/auth";
import { requireBooksEnabled } from "@/lib/routing/useFeatures";
import { ListenPage } from "@/features/player/ListenPage";

export const Route = createFileRoute("/books/$bookId/listen")({
  beforeLoad: async ({ context }) => {
    const user = await getCurrentUser();
    if (!user) throw redirect({ to: "/login" });
    await requireBooksEnabled(context.queryClient);
    return { user };
  },
  component: ListenRoute,
});

function ListenRoute() {
  const { bookId } = Route.useParams();
  return <ListenPage bookId={Number(bookId)} />;
}
