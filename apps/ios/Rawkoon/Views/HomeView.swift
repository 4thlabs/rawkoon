import RawkoonKit
import SwiftUI

/// The home screen for every user: greeting, Continue, Recently Added,
/// Upcoming and For-You rails, then a widget stack (Now Watching, Downloads,
/// Library Attention, RSS, Library stats). The ops widgets (Downloads, RSS,
/// Library stats) are admin-only; all widgets also self-hide when their
/// integration is off or has no data.
struct HomeView: View {
    @Environment(AppModel.self) var model
    @Environment(\.isActiveRootTab) var isActiveRootTab

    @State var recent: [LibraryMedia] = []
    @State private var upcoming: [UpcomingItem] = []
    @State private var discover: DiscoverDeckResponse?
    @State var nowPlaying: NowPlayingResponse?
    @State var speed: SpeedResponse?
    @State var attention: [AttentionItem] = []
    @State var rss: RssStatusResponse?
    @State var stats: LibraryStats?
    @State private var growth: LibraryGrowth?
    /// Nil until the features request (or its cache) answers, so Books never flashes in.
    @State private var booksEnabled: Bool?
    @State var reencodeSummary: TranscodeSummary?
    @State private var loading = true
    /// When the last full refresh finished, so switching back to Home within a
    /// few seconds doesn't refetch every rail.
    @State private var lastLoadedAt: Date?
    @State private var hydrated = false
    /// Bumped on pull-to-refresh and when Continue's player sheet dismisses
    /// so Listening reloads with Continue.
    @State private var continueToken = 0
    /// A "Needs attention" row tapped: the widget carries only a library id, so
    /// resolve the full item (for its tmdbId/poster) then push its detail.
    @State var attentionTarget: AttentionRoute?
    @State var resolvingAttentionId: Int?
    /// The just-landed banner while it's up, and a counter that fires its haptic.
    @State var landedBanner: LandedArrival?
    @State var landedBannerCount = 0

    /// Resolved detail destination for an attention row — Hashable so it can
    /// drive `navigationDestination(item:)`, which `LibraryMedia` can't.
    struct AttentionRoute: Identifiable, Hashable {
        let id: Int
        let tmdbId: Int
        let mediaType: String
        let title: String
        let posterUrl: String?
    }

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 26) {
                greeting

                if loading, recent.isEmpty {
                    homeSkeleton
                        .transition(.rawkoonSwap)
                } else {
                    loadedContent
                        .transition(.rawkoonSwap)
                }
            }
            .padding(.vertical, 12)
            .padding(.bottom, 96)
            // Crossfade skeleton → content instead of a hard cut, so the rails
            // fade in rather than popping into place on first load.
            .rawkoonMotion(RawkoonMotion.spring, value: loading)
        }
        .reportsTabBarScroll()
        .background(Theme.base)
        .onChange(of: model.pendingMediaLink, initial: true) { _, link in
            guard let link else { return }
            model.pendingMediaLink = nil
            attentionTarget = AttentionRoute(id: link.libraryId, tmdbId: link.tmdbId, mediaType: link.mediaType,
                                             title: link.title, posterUrl: nil)
        }
        .navigationDestination(item: $attentionTarget) { route in
            MediaDetailView(tmdbId: route.tmdbId, mediaType: route.mediaType,
                            title: route.title, posterPath: route.posterUrl, libraryId: route.id)
        }
        .navigationTitle("Home")
        .navigationBarTitleDisplayMode(.inline)
        .toolbar {
            // The sidebar has Notifications and Watchlist tabs of its own.
            if UIDevice.current.userInterfaceIdiom == .phone {
                ToolbarItem(placement: .topBarTrailing) {
                    NavigationLink {
                        WatchlistView()
                    } label: {
                        Image(systemName: "bookmark")
                    }
                    .accessibilityLabel("Watchlist")
                }
                ToolbarItem(placement: .topBarTrailing) {
                    NavigationLink {
                        NotificationsListView()
                    } label: {
                        NotificationBell(unread: model.unreadNotificationCount)
                    }
                    .accessibilityLabel("Notifications")
                }
            }
        }
        .overlay(alignment: .top) { landedBannerLayer }
        .sensoryFeedback(RawkoonHaptics.feedback(for: .success), trigger: landedBannerCount)
        .onChange(of: model.recentArrivals.first) { _, arrival in landedArrived(arrival) }
        .task(id: landedBanner?.ts) { await autoDismissLandedBanner() }
        .onAppear(perform: hydrateFromCache)
        .task { await load() }
        // Kept-alive iPhone tabs never re-appear, so a revisit refreshes like the old TabView did.
        .onChange(of: isActiveRootTab) { _, active in
            if active, Date().timeIntervalSince(lastLoadedAt ?? .distantPast) > 30 {
                Task { await load() }
            }
        }
        .task { await model.refreshUnreadNotificationCount() }
        .onChange(of: model.reconnectToken) { _, _ in
            continueToken += 1
            Task { await load() }
        }
        // Re-encode progress: poll only while Home is the visible tab (.task cancels on disappear).
        // Keyed on isAdmin too: it resolves after Home first appears on a cold launch.
        .task(id: [isActiveRootTab, model.isAdmin, model.isOffline]) {
            guard model.isAdmin, isActiveRootTab, !model.isOffline else { return }
            while !Task.isCancelled {
                if let client = model.api(), let summary = try? await client.transcodeSummary() {
                    reencodeSummary = summary
                }
                try? await Task.sleep(for: .seconds(5))
            }
        }
        .refreshable {
            continueToken += 1
            await load()
        }
    }

    /// Everything below the greeting once the first load resolves.
    @ViewBuilder
    private var loadedContent: some View {
        VStack(alignment: .leading, spacing: 26) {
            ContinueListeningView(
                refreshToken: continueToken,
                limit: 3,
                onPlaybackDismiss: { continueToken += 1 }
            )
            ListeningStatsCard(refreshToken: continueToken)
                .padding(.horizontal, 16)
            if let growth, !growth.isEmpty {
                LibraryGrowthCard(growth: growth, isAdmin: model.isAdmin, showBooks: booksEnabled == true)
                    .padding(.horizontal, 16)
                    .transition(.rawkoonSwap)
            }
            if !recent.isEmpty || !model.recentArrivals.isEmpty {
                recentlyAddedRail
            }
            if !upcoming.isEmpty {
                rail("Upcoming", upcoming.map(RailItem.upcoming))
            }
            if let discover, !discover.items.isEmpty {
                rail(
                    discover.source == .personalized ? "For you" : "Trending",
                    discover.items.map(RailItem.discover)
                )
            }
            widgets
        }
    }

    // MARK: Greeting

    private var greeting: some View {
        // Re-evaluated each minute so a Home left open overnight doesn't keep saying "Good morning".
        TimelineView(.everyMinute) { context in
            let calendar = Calendar.current
            let hour = calendar.component(.hour, from: context.date)
            let weekday = calendar.component(.weekday, from: context.date)
            VStack(alignment: .leading, spacing: 4) {
                greetingLine(HomeGreeting.period(hour: hour))
                    .font(.display(28))
                    .foregroundStyle(Theme.textStrong)
                subtitle(hour: hour, weekday: weekday, now: context.date)
                    .font(.subheadline)
                    .foregroundStyle(Theme.muted)
            }
        }
        .padding(.horizontal, 16)
        // The name arrives after first render; the load-swap spring must not animate its reflow.
        .transaction { $0.animation = nil }
    }

    /// A fresh arrival outranks the time-of-day line.
    private func subtitle(hour: Int, weekday: Int, now: Date) -> Text {
        if let landed = LandedArrivals.fresh(model.recentArrivals, now: Self.epochMillis(now)).first {
            return landedSubtitle(landed)
        }
        return Text(subtitleKey(HomeGreeting.subtitle(hour: hour, weekday: weekday)))
    }

    /// With no name known yet the greeting stands alone rather than addressing
    /// a placeholder.
    private func greetingLine(_ period: HomeGreeting.Period) -> Text {
        let greeting = Text(greetingKey(period))
        guard let name = model.userFirstName, !name.isEmpty else { return greeting }
        return greeting + Text(verbatim: ", ") + Text(verbatim: name)
    }

    private func greetingKey(_ period: HomeGreeting.Period) -> LocalizedStringKey {
        switch period {
        case .morning: "Good morning"
        case .afternoon: "Good afternoon"
        case .evening: "Good evening"
        case .night: "Still up"
        }
    }

    private func subtitleKey(_ subtitle: HomeGreeting.Subtitle) -> LocalizedStringKey {
        switch subtitle {
        case .night: "One more episode? We won't tell."
        case .weekend: "Weekends are made for marathons."
        case .monday: "New week, new episodes."
        case .friday: "Friday. Pick tonight's movie."
        case .morning: "Here's what landed overnight."
        case .afternoon: "Here's what's happening."
        case .evening: "Showtime. What are we watching?"
        }
    }

    // MARK: First-load skeleton

    /// Warm shimmer standing in for the first paint: a continue card, poster rails
    /// and a widget, shaped like the real content below it.
    private var homeSkeleton: some View {
        VStack(alignment: .leading, spacing: 26) {
            // Continue-listening card.
            ShimmerView(cornerRadius: 16)
                .frame(height: 96)
                .padding(.horizontal, 16)
            skeletonRail(titleWidth: 140)
            skeletonRail(titleWidth: 96)
            skeletonRail(titleWidth: 120)
            // A widget card.
            ShimmerView(cornerRadius: 16)
                .frame(height: 120)
                .padding(.horizontal, 16)
        }
        .allowsHitTesting(false)
    }

    private func skeletonRail(titleWidth: CGFloat) -> some View {
        VStack(alignment: .leading, spacing: 10) {
            ShimmerView(cornerRadius: 6)
                .frame(width: titleWidth, height: 20)
                .padding(.horizontal, 16)
            // A plain HStack, not a nested ScrollView: that one clipped the cards to a
            // hard edge mid-crossfade. The overflow runs off-screen like the real rail.
            HStack(spacing: 12) {
                ForEach(0 ..< 4, id: \.self) { _ in
                    ShimmerView(cornerRadius: RailPoster.corner)
                        .frame(width: RailPoster.width, height: RailPoster.height)
                }
            }
            .padding(.horizontal, 16)
            .frame(maxWidth: .infinity, alignment: .leading)
        }
    }

    // MARK: Load

    /// Paints every rail from the last saved responses before the first frame,
    /// so Home opens full — offline, or while the refetch below is in flight.
    private func hydrateFromCache() {
        guard !hydrated, let client = model.api() else { return }
        hydrated = true
        if recent.isEmpty, let cached = client.cached(Endpoints.recentlyAdded()) {
            recent = cached.value.items
        }
        if upcoming.isEmpty, let cached = client.cached(Endpoints.upcoming) {
            upcoming = cached.value.items
        }
        if discover == nil, let cached = client.cached(Endpoints.discoverDeck(limit: 12)) {
            discover = cached.value
        }
        if attention.isEmpty, let cached = client.cached(Endpoints.libraryAttention) {
            attention = cached.value.items
        }
        if rss == nil, let cached = client.cached(Endpoints.rssStatus) {
            rss = cached.value
        }
        if stats == nil {
            stats = client.cachedLibraryStats()
        }
        if growth == nil, let cached = client.cached(Endpoints.libraryGrowth),
           GrowthDates.isCurrentMonth(start: cached.value.growth.month.start, timezone: cached.value.growth.timezone)
        {
            growth = cached.value.growth
        }
        if let features = client.cached(Endpoints.systemFeatures) {
            booksEnabled = features.value.booksEnabled
        }
        if !recent.isEmpty || !upcoming.isEmpty || discover != nil {
            loading = false
        }
    }

    private func load() async {
        // The first onAppear can beat the API client; paint the saved copy before the fetch.
        hydrateFromCache()
        guard let client = model.api() else {
            loading = false
            return
        }
        // Books refresh on their own; the rails below don't read them, so they
        // no longer wait on every page of the library.
        if model.needsLibraryRefresh {
            Task { await model.loadLibrary() }
        }
        async let recentR = client.recentlyAdded()
        async let upcomingR = client.upcoming()
        async let discoverR = client.discoverDeck(exclude: [], limit: 12)
        async let npR = client.nowPlaying()
        async let speedR = client.speed()
        async let attnR = client.libraryAttention()
        async let rssR = client.rssStatus()
        let isAdmin = model.isAdmin
        async let growthR = client.libraryGrowth()
        async let featuresR = client.systemFeatures()
        async let statsR: LibraryStats? = isAdmin ? client.libraryStats() : nil

        // A failed refetch (a transient error on pull-to-refresh) must not blank
        // content already on screen: replace each section only when its request
        // succeeds, so the rails survive a hiccup instead of vanishing until the
        // view is rebuilt. `(try?)?.items` returns [] for a real empty result and
        // nil only on failure, so a genuinely empty section still clears.
        if let items = await (try? recentR)?.items {
            recent = items
            loading = false
            Task {
                await WidgetSnapshotWriter.shared.updateRecent(items, model: model)
                await WidgetSnapshotWriter.shared.updateWatch(model: model)
            }
        }
        if let items = await (try? upcomingR)?.items {
            upcoming = items
        }
        if let deck = try? await discoverR {
            discover = deck
            Task { await WidgetSnapshotWriter.shared.updateSuggestion(deck, model: model) }
        }
        if let np = try? await npR {
            nowPlaying = np
        }
        if let sp = try? await speedR {
            speed = sp
        }
        if let items = await (try? attnR)?.items {
            attention = items
        }
        if let status = try? await rssR {
            rss = status
        }
        if let s = try? await statsR {
            stats = s
        }
        if let features = try? await featuresR {
            booksEnabled = features.booksEnabled
        }
        // Animated so the card swaps in and the rails below glide down instead of jumping.
        if let fresh = try? await growthR {
            withRawkoonMotion(RawkoonMotion.spring) { growth = fresh }
        } else if let kept = growth,
                  !GrowthDates.isCurrentMonth(start: kept.month.start, timezone: kept.timezone)
        {
            // A failed refresh must not leave last month's card up after the month rolls over.
            withRawkoonMotion(RawkoonMotion.spring) { growth = nil }
        }

        loading = false
        lastLoadedAt = Date()
    }
}
