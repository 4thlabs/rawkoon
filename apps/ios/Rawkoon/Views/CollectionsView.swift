import RawkoonKit
import SwiftUI

/// Franchises the library holds some of but not all, with the missing entries a tap away.
struct CollectionsView: View {
    @Environment(AppModel.self) private var model

    @State private var collections: [MediaCollection] = []
    @State private var loading = true
    @State private var error: String?

    private enum Phase: Equatable { case loading, offline, error, empty, list }

    private var phase: Phase {
        if loading, collections.isEmpty {
            return .loading
        }
        if collections.isEmpty, error != nil {
            return model.isOffline ? .offline : .error
        }
        return collections.isEmpty ? .empty : .list
    }

    var body: some View {
        ScrollView {
            content
                .padding(.top, 12)
                .padding(.bottom, 32)
                .rawkoonMotion(RawkoonMotion.spring, value: phase)
        }
        .reportsTabBarScroll()
        .refreshable { await load() }
        .background(Theme.base)
        .navigationTitle("Collections")
        .navigationBarTitleDisplayMode(.inline)
        .task {
            hydrateFromCache()
            await load()
        }
        .onChange(of: model.isOffline) { _, offline in
            guard !offline, collections.isEmpty || error != nil else { return }
            Task { await load() }
        }
    }

    @ViewBuilder private var content: some View {
        switch phase {
        case .loading:
            VStack(spacing: 12) {
                ForEach(0 ..< 3, id: \.self) { _ in
                    ShimmerView(cornerRadius: 16).frame(height: 150)
                }
            }
            .padding(.horizontal, 16)
            .allowsHitTesting(false)
            .transition(.rawkoonSwap)
        case .offline:
            ContentUnavailableView(
                "You're offline",
                systemImage: "wifi.slash",
                description: Text("This will load when you're back online.")
            )
            .rawkoonLivingSymbol(.error)
            .padding(.top, 16)
            .transition(.rawkoonSwap)
        case .error:
            ContentUnavailableView(
                "Couldn't load collections",
                systemImage: "wifi.slash",
                description: Text(error ?? "")
            )
            .rawkoonLivingSymbol(.error)
            .padding(.top, 16)
            .transition(.rawkoonSwap)
        case .empty:
            ContentUnavailableView(
                "Your collections are complete",
                systemImage: "rectangle.stack",
                description: Text("Every franchise in your library is fully collected.")
            )
            .rawkoonLivingSymbol(.empty)
            .padding(.top, 28)
            .transition(.rawkoonSwap)
        case .list:
            LazyVStack(spacing: 12) {
                ForEach(collections) { collection in
                    CollectionCard(collection: collection)
                        .rawkoonEntrance(id: collection.id)
                }
            }
            .padding(.horizontal, 16)
            .rawkoonEntranceScope()
            .transition(.rawkoonSwap)
        }
    }

    private func hydrateFromCache() {
        guard collections.isEmpty, let cached = model.api()?.cached(Endpoints.missingCollections) else { return }
        collections = cached.value.collections
    }

    private func load() async {
        guard let client = model.api() else {
            error = String(localized: "Not signed in.")
            loading = false
            return
        }
        do {
            collections = try await client.missingCollections().collections
            error = nil
        } catch is CancellationError {
            return
        } catch let apiError as APIError {
            error = apiError.userMessage(unauthorized: String(localized: "Sign in required."))
        } catch {
            self.error = String(localized: "Can't reach the server. Try again in a moment.")
        }
        loading = false
    }
}

/// One franchise: its poster, how much of it you own, and a poster strip of every entry.
private struct CollectionCard: View {
    @Environment(AppModel.self) private var model
    let collection: MediaCollection

    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            HStack(alignment: .firstTextBaseline, spacing: 8) {
                Text(verbatim: collection.name)
                    .font(.display(18))
                    .foregroundStyle(Theme.textStrong)
                    .lineLimit(2)
                Spacer(minLength: 8)
                StatusBadge(
                    verbatim: String(localized: "\(collection.ownedCount) of \(collection.totalCount) owned"),
                    tint: Theme.apricot
                )
            }
            ScrollView(.horizontal, showsIndicators: false) {
                HStack(spacing: 10) {
                    ForEach(collection.movies) { movie in
                        NavigationLink {
                            MediaDetailView(
                                tmdbId: movie.tmdbId,
                                mediaType: "movie",
                                title: movie.title,
                                posterPath: movie.posterUrl,
                                libraryId: nil
                            )
                        } label: {
                            poster(movie)
                        }
                        .buttonStyle(.rawkoonPressable)
                    }
                }
            }
        }
        .padding(14)
        .background(Theme.raised, in: RoundedRectangle(cornerRadius: 16))
        .overlay(RoundedRectangle(cornerRadius: 16).strokeBorder(Theme.border, lineWidth: 1))
    }

    private func poster(_ movie: CollectionMovie) -> some View {
        CachedAsyncImage(url: model.absoluteURL(movie.posterUrl), targetSize: CGSize(width: 96, height: 144)) { image in
            image.resizable().scaledToFill()
        } placeholder: {
            Theme.inset
        }
        .frame(width: 72)
        .aspectRatio(2.0 / 3.0, contentMode: .fit)
        .clipShape(RoundedRectangle(cornerRadius: 8))
        .overlay(alignment: .topTrailing) {
            if movie.alreadyExists {
                Image(systemName: "checkmark")
                    .font(.system(size: 9, weight: .bold))
                    .foregroundStyle(Color(hex: 0x10231A))
                    .frame(width: 18, height: 18)
                    .background(Theme.seed, in: Circle())
                    .padding(4)
                    .accessibilityLabel("In library")
            }
        }
        .overlay(RoundedRectangle(cornerRadius: 8).strokeBorder(.white.opacity(0.06), lineWidth: 1))
        .accessibilityLabel(Text(verbatim: movie.title))
    }
}
