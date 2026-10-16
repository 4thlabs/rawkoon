-- AlterTable
ALTER TABLE "library_media" ADD COLUMN     "last_search_at" TIMESTAMP(3),
ADD COLUMN     "last_search_outcome" TEXT,
ADD COLUMN     "last_search_reason" TEXT;
