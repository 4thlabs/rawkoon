import { motion, type Variants } from "motion/react";
import { useLibraryEvents } from "@/features/medias/hooks/useLibraryEvents";
import { PageLayout } from "@/components/PageLayout";
import { CardErrorBoundary } from "@/components/ErrorBoundary";
import { useCurrentUser } from "@/lib/auth/useAuth";
import { getUserFirstName } from "@/lib/utils/format";
import { HomeHero } from "@/pages/_component/HomeHero";
import { RecentlyAddedRail } from "@/pages/_component/RecentlyAddedRail";
import { UpcomingRail } from "@/pages/_component/UpcomingRail";
import { PipelineCard } from "@/pages/_component/PipelineCard";
import { ContinueListeningWidget } from "@/features/continue/ContinueListeningWidget";
import { BooksCard } from "@/features/listening/BooksCard";

// ─── Motion variants ──────────────────────────────────────────────────────────

const sectionsVariants: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.055 } },
};

const sectionVariants: Variants = {
  hidden: { opacity: 0, y: 10 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.4, ease: [0.16, 1, 0.3, 1] },
  },
};

// ─── Main page ────────────────────────────────────────────────────────────────

/**
 * Home is a fixed composition: the hero, Continue beside the pipeline and
 * books cards (stacked under it on phones), then two full-width poster rails.
 * No configurable layout, edit mode, or persistence.
 */
export function HomePage() {
  const { data: user } = useCurrentUser();
  useLibraryEvents();

  return (
    <PageLayout fullWidth>
      <HomeHero userName={getUserFirstName(user)} />
      <motion.div
        className="mt-6 space-y-8"
        variants={sectionsVariants}
        initial="hidden"
        animate="show"
      >
        <motion.div
          variants={sectionVariants}
          className="grid items-start gap-4 lg:grid-cols-[minmax(0,1fr)_20.5rem]"
        >
          <CardErrorBoundary>
            <ContinueListeningWidget />
          </CardErrorBoundary>
          <div className="space-y-4 lg:col-start-2 lg:row-start-1">
            <CardErrorBoundary>
              <PipelineCard />
            </CardErrorBoundary>
            <CardErrorBoundary>
              <BooksCard />
            </CardErrorBoundary>
          </div>
        </motion.div>
        <motion.div variants={sectionVariants}>
          <CardErrorBoundary>
            <RecentlyAddedRail />
          </CardErrorBoundary>
        </motion.div>
        <motion.div variants={sectionVariants}>
          <CardErrorBoundary>
            <UpcomingRail />
          </CardErrorBoundary>
        </motion.div>
      </motion.div>
    </PageLayout>
  );
}
