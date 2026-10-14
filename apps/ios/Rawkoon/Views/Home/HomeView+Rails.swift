import RawkoonKit
import SwiftUI

extension HomeView {
    // MARK: Poster rails

    enum RailItem: Identifiable {
        case library(LibraryMedia)
        case landed(LandedArrival)
        case upcoming(UpcomingItem)
        case discover(DiscoverDeckItem)
        var id: String {
            switch self {
            case let .library(m): "l\(m.id)"
            // Same id as the library card, so expiry swaps in place without replaying the entrance.
            case let .landed(a): "l\(a.mediaId)"
            case let .upcoming(u): "u\(u.id)"
            case let .discover(d): "d\(d.id)"
            }
        }
    }

    func rail(_ title: LocalizedStringKey, _ items: [RailItem]) -> some View {
        VStack(alignment: .leading, spacing: 10) {
            Text(title).font(.sectionTitle).foregroundStyle(Theme.textStrong).padding(.horizontal, 16)
            ScrollView(.horizontal, showsIndicators: false) {
                HStack(spacing: 12) {
                    ForEach(items) { item in
                        railCard(item)
                            .rawkoonEntrance(id: item.id)
                            .transition(.rawkoonReveal)
                    }
                }
                .rawkoonMotion(RawkoonMotion.spring, value: items.map(\.id))
                .padding(.horizontal, 16)
            }
            // One ledger per rail, so each rail cascades left to right on its own.
            .rawkoonEntranceScope()
            // Pin the rail height instead of inheriting it from the posters'
            // intrinsic size through the scroll view: an outer `.refreshable`
            // pull can momentarily collapse a nested horizontal ScrollView to
            // zero height, hiding the rail until the view is rebuilt. A fixed
            // height keeps it laid out across the refresh.
            .frame(height: RailPoster.height)
        }
    }

    @ViewBuilder
    private func railCard(_ item: RailItem) -> some View {
        switch item {
        case let .library(m):
            let zoomID = RawkoonZoom.media(tmdbId: m.tmdbId, mediaType: m.type == "show" ? "tv" : "movie")
            NavigationLink {
                MediaDetailView(tmdbId: m.tmdbId, mediaType: m.type == "show" ? "tv" : "movie",
                                title: m.title, posterPath: m.posterUrl, libraryId: m.id)
                    .rawkoonZoomDestination(zoomID)
            } label: {
                MediaPosterCard(title: m.title, posterURL: model.absoluteURL(m.posterUrl),
                                width: RailPoster.width, corner: RailPoster.corner)
                    .rawkoonZoomSource(zoomID)
            }
            .buttonStyle(.rawkoonPressable)
        case let .landed(a):
            Button { openLanded(a) } label: {
                MediaPosterCard(title: a.title, posterURL: model.absoluteURL(a.posterUrl),
                                episode: a.code.isEmpty ? nil : a.code,
                                width: RailPoster.width, corner: RailPoster.corner)
                    .overlay(alignment: .topLeading) { landedStamp }
            }
            .buttonStyle(.rawkoonPressable)
        case let .upcoming(u):
            let zoomID = RawkoonZoom.media(tmdbId: u.tmdbId ?? 0, mediaType: u.mediaType)
            NavigationLink {
                MediaDetailView(tmdbId: u.tmdbId ?? 0, mediaType: u.mediaType,
                                title: u.title, posterPath: u.posterUrl, libraryId: u.libraryId)
                    .rawkoonZoomDestination(zoomID)
            } label: {
                MediaPosterCard(title: u.title, posterURL: model.absoluteURL(u.posterUrl),
                                date: u.displayDate, episode: u.episodeLabel,
                                width: RailPoster.width, corner: RailPoster.corner)
                    .rawkoonZoomSource(zoomID)
            }
            .buttonStyle(.rawkoonPressable)
            .disabled(u.tmdbId == nil && u.libraryId == nil)
        case let .discover(d):
            let zoomID = RawkoonZoom.media(tmdbId: d.tmdbId, mediaType: d.mediaType)
            NavigationLink {
                MediaDetailView(tmdbId: d.tmdbId, mediaType: d.mediaType,
                                title: d.title, posterPath: d.posterUrl, libraryId: nil)
                    .rawkoonZoomDestination(zoomID)
            } label: {
                MediaPosterCard(title: d.title, posterURL: model.absoluteURL(d.posterUrl),
                                width: RailPoster.width, corner: RailPoster.corner)
                    .rawkoonZoomSource(zoomID)
            }
            .buttonStyle(.rawkoonPressable)
        }
    }

    /// Matches the web `MediaPosterCard`: 2:3 poster with title (and optional
    /// date / episode) in a bottom glass panel, never captioned underneath.
    enum RailPoster {
        static let width: CGFloat = 140
        static let height: CGFloat = 210
        static let corner: CGFloat = 16
    }
}
