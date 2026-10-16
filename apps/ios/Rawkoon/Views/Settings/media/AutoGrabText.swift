import RawkoonKit
import SwiftUI

/// Wording for server-side check ids and grab outcomes.
enum AutoGrabText {
    private static func clientName(_ type: String?) -> String {
        switch type {
        case "qbittorrent": "qBittorrent"
        case "transmission": "Transmission"
        case "deluge": "Deluge"
        default: type ?? "The download client"
        }
    }

    private static func managerName(_ manager: String?) -> String {
        manager == "jackett" ? "Jackett" : "Prowlarr"
    }

    static func grabFailure(_ reason: GrabPendingReason?) -> String {
        switch reason {
        case .noSpace: String(localized: "Not enough free space to grab it.")
        case .notWanted: String(localized: "It is no longer wanted.")
        case .alreadyActive: String(localized: "It is already downloading.")
        case .allFailed: String(localized: "Every held release was blocked or failed.")
        case nil: String(localized: "Nothing was grabbed.")
        }
    }

    // swiftlint:disable:next cyclomatic_complexity
    static func readiness(_ check: GrabReadinessCheck) -> String {
        let params = check.params
        let manager = managerName(params.manager)
        switch (check.id, check.status) {
        case ("indexer_manager", .error):
            if params.reason == "unreachable" {
                return String(localized: "Can't reach \(manager), so searches and RSS checks fail.")
            }
            return String(localized: "No indexer manager is set up, so nothing can be searched.")
        case ("indexer_manager", .warn):
            return String(localized: "\(manager) is connected but has no enabled indexers, so searches find nothing.")
        case ("indexer_manager", .ok):
            let count = params.indexers ?? 0
            return count == 1
                ? String(localized: "\(manager) is connected with 1 indexer enabled.")
                : String(localized: "\(manager) is connected with \(count) indexers enabled.")
        case ("download_client", .error):
            if params.reason == "unreachable" {
                return String(localized: "Can't reach \(clientName(params.clientType)), so grabs fail.")
            }
            return String(localized: "No download client is set up, so releases have nowhere to go.")
        case ("download_client", _):
            return String(localized: "\(clientName(params.clientType)) is connected.")
        case ("default_movie_profile", .ok):
            return String(localized: "New movies use the \(params.profileName ?? "") quality profile.")
        case ("default_movie_profile", _):
            return String(localized: "No default movie quality profile: new movies accept any release.")
        case ("default_show_profile", .ok):
            return String(localized: "New shows use the \(params.profileName ?? "") quality profile.")
        case ("default_show_profile", _):
            return String(localized: "No default show quality profile: new shows accept any release.")
        case ("rss_indexers", .ok):
            return String(localized: "RSS checks watch \(params.watched ?? 0) of \(params.total ?? 0) indexers.")
        case ("rss_indexers", _):
            return String(localized: "RSS checks watch no indexer, so new releases are never picked up on their own.")
        case ("profiles_without_maximum", .ok):
            return String(localized: "Every quality profile has a maximum resolution.")
        case ("profiles_without_maximum", _):
            let count = params.profiles?.count ?? 0
            return count == 1
                ? String(localized: "1 quality profile has no maximum resolution, so a 1080p profile can still grab 4K.")
                : String(localized: "\(count) quality profiles have no maximum resolution, so a 1080p profile can still grab 4K.")
        case ("search_on_add", _):
            return params.enabled == false
                ? String(localized: "Search waits for the scheduled check after a movie or show is added.")
                : String(localized: "Search starts as soon as a movie or show is added.")
        default:
            return check.id
        }
    }
}
