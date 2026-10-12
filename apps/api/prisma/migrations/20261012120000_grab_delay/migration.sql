-- AlterTable
ALTER TABLE "quality_profiles" ADD COLUMN     "grab_delay_minutes" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "bypass_delay_if_cutoff_met" BOOLEAN NOT NULL DEFAULT true;

-- CreateTable
CREATE TABLE "pending_releases" (
    "id" SERIAL NOT NULL,
    "target_key" TEXT NOT NULL,
    "media_id" INTEGER NOT NULL,
    "episode_id" INTEGER,
    "season" INTEGER,
    "release_guid" TEXT NOT NULL,
    "release_title" TEXT NOT NULL,
    "indexer" TEXT,
    "release" JSONB NOT NULL,
    "score" DOUBLE PRECISION NOT NULL,
    "source" TEXT,
    "published_at" TIMESTAMP(3),
    "grab_after" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "pending_releases_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "uq_pending_release_target_guid" ON "pending_releases"("target_key", "release_guid");

-- CreateIndex
CREATE INDEX "ix_pending_releases_grab_after" ON "pending_releases"("grab_after");

-- CreateIndex
CREATE INDEX "ix_pending_releases_media_id" ON "pending_releases"("media_id");

-- AddForeignKey
ALTER TABLE "pending_releases" ADD CONSTRAINT "pending_releases_media_id_fkey" FOREIGN KEY ("media_id") REFERENCES "library_media"("id") ON DELETE CASCADE ON UPDATE CASCADE;
