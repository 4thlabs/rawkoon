import RawkoonKit
import SwiftUI

extension MediaDetailView {
    // MARK: Similar

    @ViewBuilder
    var similarSection: some View {
        VStack(alignment: .leading, spacing: 10) {
            Text("Similar titles")
                .font(.sectionTitle)
                .foregroundStyle(Theme.textStrong)
                .padding(.horizontal, 16)
            similarBody
        }
    }

    @ViewBuilder
    var similarBody: some View {
        if loadingSimilar, similarItems.isEmpty {
            LazyVGrid(columns: similarColumns, spacing: 14) {
                ForEach(0 ..< 6, id: \.self) { _ in
                    VStack(alignment: .leading, spacing: 6) {
                        ShimmerView(cornerRadius: 10)
                            .aspectRatio(2.0 / 3.0, contentMode: .fit)
                        ShimmerView(cornerRadius: 4).frame(height: 12)
                    }
                }
            }
            .padding(.horizontal, 16)
            .allowsHitTesting(false)
        } else if let similarError {
            VStack(alignment: .leading, spacing: 10) {
                Text(similarError)
                    .font(.subheadline)
                    .foregroundStyle(Theme.muted)
                Button {
                    Task { await fetchSimilar() }
                } label: {
                    Label("Try again", systemImage: "arrow.clockwise")
                }
                .buttonStyle(.bordered)
                .tint(Theme.apricot)
            }
            .padding(.horizontal, 16)
        } else if similarItems.isEmpty {
            Text("No similar titles.")
                .font(.subheadline)
                .foregroundStyle(Theme.muted)
                .padding(.horizontal, 16)
        } else {
            LazyVGrid(columns: similarColumns, spacing: 14) {
                ForEach(similarItems) { item in
                    similarCard(item)
                }
            }
            .padding(.horizontal, 16)
        }
    }

    func similarZoomID(_ item: TmdbSearchItem) -> RawkoonZoom.ID {
        ZoomSourceKey.scoped(
            RawkoonZoom.media(tmdbId: item.tmdbId, mediaType: item.mediaType),
            in: "similar:\(mediaType):\(tmdbId)"
        )
    }

    func similarCard(_ item: TmdbSearchItem) -> some View {
        let zoomID = similarZoomID(item)
        return NavigationLink {
            MediaDetailView(
                tmdbId: item.tmdbId,
                mediaType: item.mediaType,
                title: item.title,
                posterPath: item.posterUrl,
                libraryId: item.libraryId
            )
            .rawkoonZoomDestination(zoomID)
        } label: {
            MediaPosterCard(
                title: item.title,
                posterURL: model.absoluteURL(item.posterUrl),
                menuItems: mediaPosterMenuItems(inLibrary: item.libraryId != nil, isAdmin: model.isAdmin),
                onMenuAction: { handleSimilarMenu($0, item: item) }
            ) {
                if let libraryId = item.libraryId, busySimilarLibraryIds.contains(libraryId) {
                    ProgressView().tint(Theme.apricot)
                } else if item.alreadyExists == true {
                    Circle().fill(Theme.seed).frame(width: 22, height: 22)
                        .overlay(Image(systemName: "checkmark").font(.system(size: 11, weight: .bold)).foregroundStyle(Color(hex: 0x10231A)))
                }
            }
            .rawkoonZoomSource(zoomID)
        }
        .buttonStyle(.rawkoonPressable)
    }
}
