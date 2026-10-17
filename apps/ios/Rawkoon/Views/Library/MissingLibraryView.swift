import RawkoonKit
import SwiftUI

/// Wanted titles whose most recent search found no release or failed.
struct MissingLibraryView: View {
    @Environment(AppModel.self) private var model
    @State private var items: [LibraryMedia]?
    @State private var failed = false

    var body: some View {
        List {
            if let items {
                if items.isEmpty {
                    Label("No failed searches", systemImage: "checkmark.circle.fill")
                        .foregroundStyle(Theme.seed)
                }
                ForEach(items) { item in
                    NavigationLink {
                        MediaDetailView(
                            tmdbId: item.tmdbId,
                            mediaType: item.type == "show" ? "tv" : "movie",
                            title: item.title,
                            posterPath: item.posterUrl,
                            libraryId: item.id
                        )
                    } label: {
                        VStack(alignment: .leading, spacing: 4) {
                            Text(item.title).foregroundStyle(Theme.textStrong)
                            if let note = item.lastSearchNote {
                                LastSearchLine(note: note, showsReason: true)
                            }
                        }
                    }
                }
            } else if failed {
                Text("Couldn't load the missing titles.").foregroundStyle(Theme.terracotta)
            } else {
                ProgressView()
            }
        }
        .settingsScreenStyle()
        .navigationTitle("Searches that found nothing")
        .navigationBarTitleDisplayMode(.inline)
        .task { await refresh() }
        .refreshable { await refresh() }
    }

    private func refresh() async {
        guard let client = model.api() else { return }
        do {
            items = try await MissingLibrarySearches.load(client: client)
            failed = false
        } catch {
            failed = items == nil
        }
    }
}

enum MissingLibrarySearches {
    static func load(client: APIClient) async throws -> [LibraryMedia] {
        var wanted: [LibraryMedia] = []
        var page = 1
        while true {
            try Task.checkCancellation()
            let response = try await client.libraryList(status: "wanted", page: page, limit: 60)
            wanted.append(contentsOf: response.items)
            guard response.hasMore == true else { break }
            page += 1
        }
        return LastSearchNote.recentMisses(wanted, limit: wanted.count, note: \.lastSearchNote)
    }
}
