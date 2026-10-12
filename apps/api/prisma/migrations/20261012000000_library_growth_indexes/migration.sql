-- CreateIndex
CREATE INDEX "ix_library_episodes_downloaded_at" ON "library_episodes"("downloaded_at");

-- CreateIndex
CREATE INDEX "ix_download_history_completed_at" ON "download_history"("completed_at");
