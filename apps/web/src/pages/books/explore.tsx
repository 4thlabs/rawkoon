import { createFileRoute, redirect } from "@tanstack/react-router";
import { getCurrentUser } from "@/lib/auth";
import { requireBooksEnabled } from "@/lib/routing/useFeatures";
import { BooksExplorePage } from "@/pages/books/_component/BooksExplorePage";

export const Route = createFileRoute("/books/explore")({
  beforeLoad: async ({ context }) => {
    const user = await getCurrentUser();
    if (!user) throw redirect({ to: "/login" });
    await requireBooksEnabled(context.queryClient);
    return { user };
  },
  component: BooksExplorePage,
});
