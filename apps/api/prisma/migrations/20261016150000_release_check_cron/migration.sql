-- AlterTable
ALTER TABLE "media_settings" ADD COLUMN     "release_check_cron" TEXT NOT NULL DEFAULT '0 */6 * * *';
