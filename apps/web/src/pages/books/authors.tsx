import { createFileRoute, redirect } from "@tanstack/react-router";
import { getCurrentUser } from "@/lib/auth";
import { requireBooksEnabled } from "@/lib/routing/useFeatures";
import { AuthorsPage } from "@/pages/books/_component/AuthorsPage";

export const Route = createFileRoute("/books/authors")({
  beforeLoad: async ({ context }) => {
    const user = await getCurrentUser();
    if (!user) throw redirect({ to: "/login" });
    await requireBooksEnabled(context.queryClient);
    return { user };
  },
  component: AuthorsPage,
});
