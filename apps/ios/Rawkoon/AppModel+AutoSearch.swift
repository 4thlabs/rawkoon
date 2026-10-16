import Foundation

extension AppModel {
    /// Searches the indexers and grabs the best release for a movie, reporting through the
    /// item's live toast. `onChoose` replaces the toast's default "Choose a release" action.
    /// True when grabbed.
    @discardableResult
    func autoSearchMovie(libraryId: Int, title: String, onChoose: (() -> Void)? = nil) async -> Bool {
        guard let client = api() else { return false }
        return await liveSearch.search(mediaId: libraryId, title: title, isShow: false, onChoose: onChoose) {
            try await client.searchMovie(id: libraryId)
        }
    }

    /// Asks the server to look for an upgrade after a quality-profile change.
    func startUpgradeSearch(libraryId: Int) async {
        guard let client = api() else { return }
        do {
            _ = try await client.startUpgradeSearch(id: libraryId)
            toast(String(localized: "Upgrade search started."), style: .success)
        } catch {
            toast(String(localized: "Upgrade search failed."), style: .error)
        }
    }
}

extension ConfirmRequest {
    /// Shown after a quality-profile change that leaves the downloaded file(s)
    /// below the new profile. Shows get no manual choice: there is no single sheet
    /// for "every failing episode".
    static func upgradePrompt(
        isShow: Bool,
        profileName: String,
        affectedEpisodes: Int,
        onAutoSearch: @escaping @MainActor () -> Void,
        onChoose: @escaping @MainActor () -> Void
    ) -> ConfirmRequest {
        ConfirmRequest(
            title: isShow
                ? String(localized: "Some episodes don't meet “\(profileName)”")
                : String(localized: "The current file doesn't meet “\(profileName)”"),
            message: isShow
                ? String(localized: "\(affectedEpisodes) downloaded episodes fall short. Look for better releases now?")
                : String(localized: "Look for a better release now?"),
            confirmTitle: String(localized: "Auto search for an upgrade"),
            isDestructive: false,
            action: onAutoSearch,
            secondaryTitle: isShow ? nil : String(localized: "Choose a release"),
            secondaryAction: isShow ? nil : onChoose,
            cancelTitle: String(localized: "Keep the current file")
        )
    }
}
