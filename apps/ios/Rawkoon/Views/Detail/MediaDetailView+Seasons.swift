import RawkoonKit
import SwiftUI

extension MediaDetailView {
    // MARK: Seasons (interactive)

    @ViewBuilder
    var seasonsSection: some View {
        if let seasons = details?.seasons, !seasons.isEmpty {
            DetailSeasonsSection(
                seasons: seasons,
                episodesBySeason: episodesBySeason,
                filesBySeason: filesBySeason,
                inLibrary: libraryId != nil,
                isAdmin: model.isAdmin,
                onSeasonAutoSearch: { season in Task { await seasonAutoSearch(season) } },
                onSeasonReleaseSearch: { season in
                    releaseSearchSeason = season
                    showingReleaseSearch = true
                },
                onSeasonRetrySkipped: { season in Task { await seasonRetrySkipped(season) } },
                onSeasonToggleMonitor: { season, value in Task { await seasonToggleMonitor(season, value) } },
                onSeasonReencode: { season in
                    if let libraryId {
                        reencodeTarget = ReencodeTarget(
                            selection: TranscodeSelection(mediaId: libraryId, season: season),
                            subtitle: "\(title) · " + String(localized: "Season \(season)")
                        )
                    }
                },
                onFileReencode: { file in
                    reencodeTarget = ReencodeTarget(
                        selection: TranscodeSelection(fileIds: [file.id]),
                        subtitle: file.fileName
                    )
                },
                onEpisodeAutoSearch: { episode in Task { await episodeAutoSearch(episode) } },
                onEpisodeReleaseSearch: { episode in
                    releaseSearchSeason = episode.season
                    releaseSearchEpisode = episode.episode
                    showingReleaseSearch = true
                },
                onEpisodeToggleMonitor: { episode in Task { await episodeToggleMonitor(episode) } },
                onEpisodeRetry: { episode in Task { await episodeRetry(episode) } },
                onEpisodeDeleteFile: { episode in pendingEpisodeDelete = episode },
                onFileChanged: { Task { await refreshManagementData() } },
                onFileNotice: { managementNotice = $0; managementError = nil },
                onFileError: { managementError = $0 }
            )
        }
    }
}
