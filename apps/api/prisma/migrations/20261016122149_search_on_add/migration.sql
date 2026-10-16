-- AlterTable
ALTER TABLE "media_settings" ADD COLUMN     "search_on_add" BOOLEAN NOT NULL DEFAULT true;

-- AlterTable
ALTER TABLE "transcode_settings" ALTER COLUMN "updated_at" DROP DEFAULT;
