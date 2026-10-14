import RawkoonKit
import SwiftUI

extension HomeView {
    // MARK: Just landed

    static func epochMillis(_ date: Date) -> Int {
        Int(date.timeIntervalSince1970 * 1000)
    }

    /// The greeting subtitle while an arrival is fresh: "<title> <code> just landed."
    func landedSubtitle(_ arrival: LandedArrival) -> Text {
        arrival.code.isEmpty
            ? Text("\(arrival.title) just landed.")
            : Text("\(arrival.title) \(arrival.code) just landed.")
    }

    /// Prefers the fetched row's title and poster: the event can't know the user's title language.
    func display(_ arrival: LandedArrival) -> LandedArrival {
        guard let item = recent.first(where: { $0.id == arrival.mediaId }) else { return arrival }
        return arrival.displayed(title: item.title, posterUrl: item.posterUrl)
    }

    /// Fresh arrivals first, then the fetched items minus the ones already pinned.
    func recentlyAddedItems(at date: Date) -> [RailItem] {
        let landed = LandedArrivals.fresh(model.recentArrivals, now: Self.epochMillis(date))
        let pinned = Set(landed.map(\.mediaId))
        return landed.map { RailItem.landed(display($0)) } + recent.filter { !pinned.contains($0.id) }.map(RailItem.library)
    }

    var recentlyAddedRail: some View {
        // Re-evaluated each minute so a pinned arrival drops off when it expires.
        TimelineView(.everyMinute) { context in
            let items = recentlyAddedItems(at: context.date)
            if !items.isEmpty {
                rail("Recently added", items)
            }
        }
    }

    var landedStamp: some View {
        Text("Just landed")
            .font(.caption2.weight(.bold))
            .foregroundStyle(Theme.base)
            .padding(.horizontal, 8)
            .padding(.vertical, 3)
            .background(Capsule().fill(Theme.apricot))
            .padding(6)
    }

    /// The detail view needs the TMDB id the arrival doesn't carry, so take it from the fetched item when present.
    func openLanded(_ arrival: LandedArrival) {
        guard let item = recent.first(where: { $0.id == arrival.mediaId }) else {
            openAttention(mediaId: arrival.mediaId)
            return
        }
        attentionTarget = AttentionRoute(
            id: item.id,
            tmdbId: item.tmdbId,
            mediaType: item.type == "show" ? "tv" : "movie",
            title: item.title,
            posterUrl: item.posterUrl
        )
    }

    /// A new arrival refreshes the rail's source, and shows the banner when Home is what the user is looking at.
    func landedArrived(_ arrival: LandedArrival?) {
        guard let arrival, !LandedArrivals.fresh([arrival], now: Self.epochMillis(Date())).isEmpty else { return }
        Task {
            if let client = model.api(), let items = try? await client.recentlyAdded().items {
                recent = items
            }
        }
        guard isActiveRootTab else { return }
        withRawkoonMotion(RawkoonMotion.spring) { landedBanner = display(arrival) }
        landedBannerCount += 1
    }

    func autoDismissLandedBanner() async {
        guard landedBanner != nil else { return }
        try? await Task.sleep(for: .seconds(4))
        guard !Task.isCancelled else { return }
        withRawkoonMotion(RawkoonMotion.spring) { landedBanner = nil }
    }

    var landedBannerLayer: some View {
        // The animation sits outside the `if` so insertion and removal both animate.
        ZStack {
            if let arrival = landedBanner {
                LandedBannerView(arrival: arrival, posterURL: model.absoluteURL(arrival.posterUrl)) {
                    landedBanner = nil
                    openLanded(arrival)
                }
                .padding(.top, 8)
                .transition(.rawkoonEdge(.top))
            }
        }
        .rawkoonMotion(RawkoonMotion.spring, value: landedBanner?.ts)
    }
}

/// Small in-app banner for an import that just finished: poster thumb, stamp, title and code.
struct LandedBannerView: View {
    let arrival: LandedArrival
    let posterURL: URL?
    let onOpen: () -> Void

    var body: some View {
        HStack(spacing: 12) {
            CachedAsyncImage(url: posterURL, targetSize: CGSize(width: 72, height: 108)) { image in
                image.resizable().scaledToFill()
            } placeholder: {
                Image(systemName: "photo").foregroundStyle(Theme.faint)
            }
            .frame(width: 36, height: 54)
            .background(Theme.raised)
            .clipShape(RoundedRectangle(cornerRadius: 6, style: .continuous))
            VStack(alignment: .leading, spacing: 2) {
                Text("Just landed")
                    .font(.caption2.weight(.bold))
                    .foregroundStyle(Theme.apricot)
                Text(verbatim: arrival.code.isEmpty ? arrival.title : "\(arrival.title) \(arrival.code)")
                    .font(.subheadline.weight(.semibold))
                    .foregroundStyle(Theme.textStrong)
                    .lineLimit(1)
            }
            .frame(maxWidth: .infinity, alignment: .leading)
        }
        .padding(10)
        .glassEffect(.regular.interactive(), in: .rect(cornerRadius: 14))
        .padding(.horizontal, 16)
        .contentShape(Rectangle())
        .onTapGesture(perform: onOpen)
        .accessibilityElement(children: .combine)
        .accessibilityAddTraits(.isButton)
    }
}
