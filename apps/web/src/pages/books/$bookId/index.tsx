import { createFileRoute, redirect } from "@tanstack/react-router";
import { getCurrentUser } from "@/lib/auth";
import { requireBooksEnabled } from "@/lib/routing/useFeatures";
import { BookDetailPage } from "@/pages/books/_component/BookDetailPage";

export const Route = createFileRoute("/books/$bookId/")({
  beforeLoad: async ({ context }) => {
    const user = await getCurrentUser();
    if (!user) throw redirect({ to: "/login" });
    await requireBooksEnabled(context.queryClient);
    return { user };
  },
  component: BookDetailRoute,
});

function BookDetailRoute() {
  const { bookId } = Route.useParams();
  return <BookDetailPage bookId={Number(bookId)} />;
}
