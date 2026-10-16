import { createFileRoute, redirect } from "@tanstack/react-router";
import { getCurrentUser } from "@/lib/auth";
import { requireBooksEnabled } from "@/lib/routing/useFeatures";
import { ReaderPage } from "@/features/reader/ReaderPage";

export const Route = createFileRoute("/books/$bookId/read")({
  beforeLoad: async ({ context }) => {
    const user = await getCurrentUser();
    if (!user) throw redirect({ to: "/login" });
    await requireBooksEnabled(context.queryClient);
    return { user };
  },
  component: ReadRoute,
});

function ReadRoute() {
  const { bookId } = Route.useParams();
  return <ReaderPage bookId={Number(bookId)} />;
}
