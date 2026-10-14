import RawkoonKit
import SwiftUI

extension AppModel {
    /// Adds a discover pick: admins put it straight in the library, everyone else files a request.
    func addDiscoverPick(_ item: DiscoverDeckItem) async throws {
        guard let client = api() else { throw URLError(.notConnectedToInternet) }
        let type = item.mediaType == "tv" ? "show" : "movie"
        if isAdmin {
            _ = try await serverStateStore.addToLibrary(
                provisional: .provisional(
                    tmdbId: item.tmdbId,
                    type: type,
                    title: item.title,
                    year: item.releaseYear,
                    posterUrl: item.posterUrl,
                    overview: item.overview
                ),
                request: { try await client.addToLibrary(tmdbId: item.tmdbId, type: type) }
            )
            await loadLibrary()
        } else {
            _ = try await client.createRequest(CreateRequestBody(
                tmdbId: item.tmdbId,
                type: type,
                title: item.title,
                posterUrl: item.posterUrl,
                year: item.releaseYear,
                googleVolumeId: nil,
                author: nil
            ))
        }
        requestPushAuthorization()
    }
}

/// Home's opening film: a rotating backdrop deck with the greeting overlaid.
/// Sits at the top of the scroll content with rounded bottom corners, so the
/// navigation bar and the tab-bar scroll inset stay exactly as they are.
struct HomeHero<Greeting: View>: View {
    @Environment(AppModel.self) private var model
    @Environment(\.accessibilityReduceMotion) private var reduceMotion
    /// Kept-alive tabs never disappear, so the hero must stop itself off-screen.
    @Environment(\.isActiveRootTab) private var isActiveRootTab

    let hero: DashboardHeroResponse
    let greeting: () -> Greeting

    @State private var storedIndex = 0
    @State private var added: Set<Int> = []
    @State private var adding = false

    private let height: CGFloat = 460

    init(hero: DashboardHeroResponse, @ViewBuilder greeting: @escaping () -> Greeting) {
        self.hero = hero
        self.greeting = greeting
    }

    private var items: [DashboardHeroItem] {
        hero.items
    }

    private var index: Int {
        HeroRotation.clamp(storedIndex, count: items.count)
    }

    private struct RotationKey: Hashable {
        var index: Int
        var count: Int
        var paused: Bool
    }

    var body: some View {
        if items.indices.contains(index) {
            let item = items[index]
            ZStack(alignment: .bottomLeading) {
                backdrop(item)
                    .id(item.id)
                    .transition(.opacity)
                LinearGradient(
                    colors: [.clear, Theme.base.opacity(0.55), Theme.base],
                    startPoint: .center, endPoint: .bottom
                )
                LinearGradient(
                    colors: [Theme.base.opacity(0.7), .clear],
                    startPoint: .leading, endPoint: .trailing
                )
                content(item)
            }
            .frame(height: height)
            .clipShape(UnevenRoundedRectangle(bottomLeadingRadius: 28, bottomTrailingRadius: 28))
            .task(id: RotationKey(index: index, count: items.count, paused: adding || !isActiveRootTab)) {
                await rotate()
            }
        }
    }

    // MARK: Rotation

    private func rotate() async {
        guard !reduceMotion, isActiveRootTab, !adding, items.count > 1 else { return }
        try? await Task.sleep(for: .seconds(HeroRotation.rotateSeconds))
        guard !Task.isCancelled else { return }
        withRawkoonMotion(.easeInOut(duration: 0.9)) {
            storedIndex = HeroRotation.next(after: index, count: items.count)
        }
    }

    private func select(_ newIndex: Int) {
        withRawkoonMotion(.easeInOut(duration: 0.9)) { storedIndex = newIndex }
    }

    // MARK: Layers

    private func backdrop(_ item: DashboardHeroItem) -> some View {
        KenBurnsBackdrop(url: model.absoluteURL(item.backdropUrl), animates: !reduceMotion && isActiveRootTab)
            .frame(maxWidth: .infinity, maxHeight: .infinity)
            .clipped()
    }

    private func content(_ item: DashboardHeroItem) -> some View {
        VStack(alignment: .leading, spacing: 14) {
            greeting()
            Spacer(minLength: 24)
            VStack(alignment: .leading, spacing: 6) {
                Text(kicker)
                    .font(.caption.weight(.semibold))
                    .textCase(.uppercase)
                    .tracking(1.6)
                    .foregroundStyle(Theme.apricotSoft)
                Text(verbatim: item.title)
                    .font(.display(34))
                    .foregroundStyle(Theme.textStrong)
                    .lineLimit(2)
                if let meta = metaLine(item) {
                    Text(verbatim: meta)
                        .font(.subheadline)
                        .foregroundStyle(Theme.text)
                }
            }
            .id(item.id)
            .transition(.opacity)
            buttons(item)
            dots
        }
        .padding(.horizontal, 16)
        .padding(.top, 12)
        .padding(.bottom, 18)
        .frame(maxWidth: .infinity, alignment: .leading)
    }

    private var kicker: LocalizedStringKey {
        switch hero.source {
        case .arrivals: "Just arrived"
        case .forYou: "For you"
        case .trending: "Trending"
        }
    }

    private func metaLine(_ item: DashboardHeroItem) -> String? {
        var parts: [String] = []
        if hero.source == .arrivals {
            let relative = ActivityPresentation.relativeTime(item.arrivedAt)
            if !relative.isEmpty {
                parts.append(String(localized: "arrived \(relative)"))
            }
        }
        if let code = item.episodeCode {
            parts.append(code)
        }
        if hero.source != .arrivals, let year = item.year {
            parts.append(String(year))
        }
        return parts.isEmpty ? nil : parts.joined(separator: " · ")
    }

    // MARK: Buttons

    private func buttons(_ item: DashboardHeroItem) -> some View {
        HStack(spacing: 12) {
            if hero.source != .arrivals {
                addButton(item)
            }
            NavigationLink {
                MediaDetailView(tmdbId: item.tmdbId, mediaType: item.mediaType,
                                title: item.title, posterPath: item.posterUrl, libraryId: item.libraryId)
            } label: {
                pill("Details", primary: hero.source == .arrivals)
            }
            .buttonStyle(.rawkoonPressable)
        }
    }

    @ViewBuilder
    private func addButton(_ item: DashboardHeroItem) -> some View {
        if added.contains(item.tmdbId) {
            // A non-admin's tap files a request rather than adding.
            pill(model.isAdmin ? "Added" : "Requested", primary: false).opacity(0.7)
        } else {
            Button {
                add(item)
            } label: {
                pill("Add", primary: true)
            }
            .buttonStyle(.rawkoonPressable)
            .disabled(adding)
        }
    }

    private func pill(_ title: LocalizedStringKey, primary: Bool) -> some View {
        Text(title)
            .font(.subheadline.weight(.semibold))
            .foregroundStyle(primary ? Theme.onAccent : Theme.textStrong)
            .padding(.horizontal, 20)
            .frame(height: 40)
            .background(Capsule().fill(primary ? Theme.apricot : Color.white.opacity(0.16)))
    }

    private func add(_ item: DashboardHeroItem) {
        adding = true
        Task {
            defer { adding = false }
            do {
                try await model.addDiscoverPick(item.deckItem)
                added.insert(item.tmdbId)
            } catch let error as APIError {
                model.toast(error.userMessage(unauthorized: String(localized: "Sign in required.")), style: .error)
            } catch {
                model.toast(String(localized: "Can't reach the server. Try again in a moment."), style: .error)
            }
        }
    }

    // MARK: Dots

    @ViewBuilder
    private var dots: some View {
        if items.count > 1 {
            HStack(spacing: 0) {
                ForEach(Array(items.enumerated()), id: \.element.id) { i, item in
                    Button {
                        select(i)
                    } label: {
                        Capsule()
                            .fill(i == index ? Theme.apricotSoft : Color.white.opacity(0.4))
                            .frame(width: i == index ? 24 : 6, height: 6)
                            .frame(width: 28, height: 28)
                            .contentShape(Rectangle())
                    }
                    .buttonStyle(.plain)
                    .accessibilityLabel(Text("Show \(item.title)"))
                    .accessibilityAddTraits(i == index ? .isSelected : [])
                }
            }
            .rawkoonMotion(RawkoonMotion.snappy, value: index)
        }
    }
}

/// The hero image with a slow alternating zoom; still under Reduce Motion.
private struct KenBurnsBackdrop: View {
    let url: URL?
    let animates: Bool

    @State private var zoomed = false

    var body: some View {
        CachedAsyncImage(url: url, targetSize: CGSize(width: 900, height: 520)) { image in
            image.resizable().scaledToFill()
        } placeholder: {
            Theme.raised
        }
        .scaleEffect(zoomed ? 1.14 : 1.04)
        .rawkoonMotion(
            animates ? .easeInOut(duration: 18).repeatForever(autoreverses: true) : .easeOut(duration: 0.6),
            value: zoomed
        )
        // Follows Reduce Motion and tab visibility live, not just at first appearance.
        .onChange(of: animates, initial: true) { _, on in zoomed = on }
    }
}
