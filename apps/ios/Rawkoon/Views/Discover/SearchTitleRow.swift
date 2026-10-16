import RawkoonKit
import SwiftUI

/// The three ways an admin can add: plain Add follows the server's auto-grab setting.
struct AddModeMenuItems: View {
    let perform: (AddMode) -> Void

    var body: some View {
        Button {
            perform(.standard)
        } label: {
            Label("Add", systemImage: "plus")
        }
        Button {
            perform(.chooseRelease)
        } label: {
            Label("Add & choose release", systemImage: "list.bullet.rectangle")
        }
        Button {
            perform(.withoutSearching)
        } label: {
            Label("Add without searching", systemImage: "pause.circle")
        }
    }
}

/// A movie or show search result: poster and facts open the detail page, the action row adds in place.
struct SearchTitleRow: View {
    @Environment(AppModel.self) private var model

    let item: TmdbSearchItem
    let action: SearchResultAction
    let busy: Bool
    /// Set once the title was added this session, so the detail page opens it as a library item.
    let libraryId: Int?
    let onAdd: (AddMode) -> Void

    private var zoomID: String {
        RawkoonZoom.media(tmdbId: item.tmdbId, mediaType: item.mediaType)
    }

    var body: some View {
        HStack(alignment: .top, spacing: 12) {
            NavigationLink { destination } label: { poster }
                .buttonStyle(.rawkoonPressable)
                // The title link beside it opens the same page.
                .accessibilityHidden(true)
            VStack(alignment: .leading, spacing: 8) {
                NavigationLink { destination } label: { facts }
                    .buttonStyle(.plain)
                actionRow
            }
        }
        .padding(12)
        .background(Theme.raised, in: RoundedRectangle(cornerRadius: 14))
        .overlay(RoundedRectangle(cornerRadius: 14).strokeBorder(Theme.border, lineWidth: 1))
        .contextMenu {
            if action.offersAddModes, !model.isOffline {
                AddModeMenuItems(perform: onAdd)
            }
        }
    }

    private var destination: some View {
        MediaDetailView(
            tmdbId: item.tmdbId,
            mediaType: item.mediaType,
            title: item.title,
            posterPath: item.posterUrl,
            libraryId: libraryId ?? item.libraryId
        )
        .rawkoonZoomDestination(zoomID)
    }

    private var poster: some View {
        CachedAsyncImage(url: model.absoluteURL(item.posterUrl), targetSize: CGSize(width: 120, height: 180)) { image in
            image.resizable().scaledToFill()
        } placeholder: {
            Theme.inset
        }
        .frame(width: 64, height: 96)
        .clipShape(RoundedRectangle(cornerRadius: 8))
        .overlay(RoundedRectangle(cornerRadius: 8).strokeBorder(.white.opacity(0.06), lineWidth: 1))
        .rawkoonZoomSource(zoomID)
    }

    private var facts: some View {
        VStack(alignment: .leading, spacing: 4) {
            Text(verbatim: item.title)
                .font(.display(17))
                .foregroundStyle(Theme.textStrong)
                .lineLimit(2)
                .multilineTextAlignment(.leading)
                .frame(maxWidth: .infinity, alignment: .leading)
            HStack(spacing: 6) {
                if let year = item.releaseYear {
                    Text(verbatim: String(year))
                }
                Text(item.mediaType == "tv" ? "TV" : "Movie")
                if let rating = item.voteAverage, rating > 0 {
                    Text(verbatim: "★ " + String(format: "%.1f", rating))
                }
            }
            .font(.system(.caption, design: .monospaced))
            .foregroundStyle(Theme.faint)
        }
    }

    @ViewBuilder
    private var actionRow: some View {
        switch action {
        case .add, .request:
            Button {
                onAdd(.standard)
            } label: {
                Group {
                    if busy {
                        ProgressView().tint(Theme.onAccent).accessibilityLabel("Adding…")
                    } else {
                        Text(action == .add ? "Add" : "Request")
                            .font(.subheadline.weight(.semibold))
                    }
                }
                .frame(minWidth: 64, minHeight: 36)
                .padding(.horizontal, 10)
                .background(Theme.apricot, in: Capsule())
                .foregroundStyle(Theme.onAccent)
            }
            .buttonStyle(.rawkoonPressable)
            .accessibilityLabel(action == .add ? Text("Add \(item.title)") : Text("Request \(item.title)"))
            .disabled(busy)
            .requiresConnection(model.isOffline)
        case .inLibrary:
            StatusBadge(text: "In library", tint: Theme.seed)
        case .requested:
            StatusBadge(text: "Requested")
        case .none:
            EmptyView()
        }
    }
}
