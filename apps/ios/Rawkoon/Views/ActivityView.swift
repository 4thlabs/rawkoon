import RawkoonKit
import SwiftUI

/// Tab root: download queue, recent history, and the upcoming calendar.
struct ActivityView: View {
    @Environment(AppModel.self) var model

    private enum Lane: String, CaseIterable, Identifiable {
        case queue = "Queue"
        case history = "History"
        case calendar = "Calendar"
        var id: String {
            rawValue
        }

        var title: LocalizedStringKey {
            switch self {
            case .queue: "Queue"
            case .history: "History"
            case .calendar: "Calendar"
            }
        }
    }

    /// One page of history rows; the limit grows by this as the list is scrolled.
    static let historyPageSize = 50

    @State private var lane: Lane = .queue
    /// The side the next lane enters from, set before the lane changes so the insertion reads it fresh.
    @State private var laneEdge: Edge = .trailing
    /// In-flight live-event reload, cancelled before the next starts so a burst
    /// of SSE events can't run overlapping lane reloads.
    @State var liveReloadTask: Task<Void, Never>?
    /// In-flight "load more history" fetch, cancelled by a live reload or a
    /// filter change so a stale page can't clobber fresher rows.
    @State var loadMoreTask: Task<Void, Never>?

    /// Header speed
    @State private var speed: SpeedResponse?

    // MARK: Queue state

    @State var queueRows: [QueueRow] = []
    /// Starts true, like the other lanes, so an empty state never flashes before the first load.
    @State var loadingQueue = true
    /// The skeleton is for the cold load only; live reloads keep the current lane still.
    @State var didLoadQueue = false
    @State var queueError: String?
    /// nil = show every card; otherwise only cards in the tapped phase.
    @State var queuePhaseFilter: QueuePhase?

    // History
    @State var activities: [ActivityRecord] = []
    @State var loadingHistory = true
    @State var loadingMoreHistory = false
    @State var historyError: String?
    @State var historyLimit = ActivityView.historyPageSize
    @State var historyHasMore = false
    @State var availableServices: [String] = []
    @State var availableTypes: [String] = []
    @State var serviceFilter: String?
    @State var typeFilter: String?

    // Calendar
    @State private var upcomingItems: [UpcomingItem] = []
    @State private var loadingCalendar = true
    @State private var calendarError: String?

    @State private var hydrated = false

    var body: some View {
        VStack(spacing: 0) {
            Picker("Lane", selection: laneSelection) {
                ForEach(Lane.allCases) { lane in
                    Text(lane.title).tag(lane)
                }
            }
            .pickerStyle(.segmented)
            .padding(.horizontal, 16)
            .padding(.top, 8)

            if let speed, showsSpeed {
                speedHeader(speed)
                    .transition(.rawkoonReveal)
            }

            ScrollView {
                // One slot, so a lane slides in over the one fading out instead of stacking under it.
                ZStack(alignment: .top) {
                    switch lane {
                    case .queue:
                        queueContent
                            .transition(.rawkoonSlide(laneEdge))
                    case .history:
                        historyContent
                            .transition(.rawkoonSlide(laneEdge))
                    case .calendar:
                        calendarContent
                            .transition(.rawkoonSlide(laneEdge))
                    }
                }
            }
        }
        .readableWidth()
        .background(Theme.base)
        .rawkoonMotion(RawkoonMotion.spring, value: showsSpeed)
        .navigationTitle("Activity")
        .navigationBarTitleDisplayMode(.inline)
        .onAppear(perform: hydrateFromCache)
        .task { await loadSpeed() }
        .task(id: lane) { await loadCurrentLane() }
        .refreshable { await loadCurrentLane() }
        .onChange(of: model.isOffline) { _, offline in
            guard !offline else { return }
            liveReloadTask?.cancel()
            loadMoreTask?.cancel()
            liveReloadTask = Task { await loadCurrentLane() }
        }
        .onChange(of: model.libraryChangeToken) { _, _ in
            liveReloadTask?.cancel()
            loadMoreTask?.cancel()
            liveReloadTask = Task { await loadCurrentLane() }
        }
        .onChange(of: model.bookChangeToken) { _, _ in
            liveReloadTask?.cancel()
            loadMoreTask?.cancel()
            liveReloadTask = Task { await loadCurrentLane() }
        }
    }

    /// Picker writes go through here, so the new lane slides in from the side of the tapped segment.
    private var laneSelection: Binding<Lane> {
        Binding(
            get: { lane },
            set: { newLane in
                laneEdge = RawkoonSlide.edge(
                    from: Lane.allCases.firstIndex(of: lane) ?? 0,
                    to: Lane.allCases.firstIndex(of: newLane) ?? 0
                )
                withRawkoonMotion(RawkoonMotion.snappy) { lane = newLane }
            }
        )
    }

    /// The header shows only while the client is connected and moving bytes.
    private var showsSpeed: Bool {
        guard let speed else { return false }
        return speed.connected && (speed.dlSpeed > 0 || speed.ulSpeed > 0)
    }

    /// Mirrors each lane's branch order, so its skeleton, error, empty and list states crossfade.
    enum LaneState: Equatable {
        case loading, failed, empty, list
    }

    static func laneState(loading: Bool, failed: Bool, isEmpty: Bool) -> LaneState {
        guard isEmpty else { return .list }
        if loading {
            return .loading
        }
        return failed ? .failed : .empty
    }

    // MARK: Header

    private func speedHeader(_ speed: SpeedResponse) -> some View {
        HStack(spacing: 14) {
            Label(Formatters.speed(speed.dlSpeed, useAll: true), systemImage: "arrow.down")
            Label(Formatters.speed(speed.ulSpeed, useAll: true), systemImage: "arrow.up")
            Spacer()
        }
        .font(.system(.caption, design: .monospaced))
        .foregroundStyle(Theme.faint)
        .padding(.horizontal, 16)
        .padding(.vertical, 8)
    }

    // MARK: Calendar

    private var calendarContent: some View {
        // A container, not a bare conditional, so the lane slide and the state swaps never share one transition.
        ZStack(alignment: .top) {
            if loadingCalendar, upcomingItems.isEmpty {
                ProgressView().tint(Theme.apricot)
                    .frame(maxWidth: .infinity, minHeight: 420)
                    .transition(.rawkoonSwap)
            } else if let calendarError, upcomingItems.isEmpty {
                errorView(calendarError)
                    .transition(.rawkoonSwap)
            } else if upcomingItems.isEmpty {
                ContentUnavailableView(
                    "Nothing upcoming",
                    systemImage: "calendar",
                    description: Text("No known releases on the horizon.")
                )
                .rawkoonLivingSymbol(.empty)
                .frame(maxWidth: .infinity, minHeight: 420)
                .transition(.rawkoonSwap)
            } else {
                LazyVStack(spacing: 8) {
                    ForEach(upcomingItems) { item in
                        calendarRow(item)
                            .rawkoonEntrance(id: item.id)
                    }
                }
                .padding(16)
                .rawkoonEntranceScope()
                .transition(.rawkoonSwap)
            }
        }
        .rawkoonMotion(
            RawkoonMotion.spring,
            value: Self.laneState(
                loading: loadingCalendar, failed: calendarError != nil, isEmpty: upcomingItems.isEmpty
            )
        )
    }

    private func calendarRow(_ item: UpcomingItem) -> some View {
        HStack(spacing: 12) {
            MediaThumb(url: model.absoluteURL(item.posterUrl), width: 48)

            VStack(alignment: .leading, spacing: 4) {
                Text(item.title)
                    .font(.display(15))
                    .foregroundStyle(Theme.textStrong)
                    .lineLimit(2)
                HStack(spacing: 8) {
                    if let releaseDate = item.releaseDate, !releaseDate.isEmpty {
                        Text(releaseDate)
                    }
                    if let season = item.seasonNumber {
                        if let episode = item.episodeNumber {
                            Text(String(format: "S%02dE%02d", season, episode))
                        } else {
                            Text(String(format: "S%02d", season))
                        }
                    }
                }
                .font(.system(.caption, design: .monospaced))
                .foregroundStyle(Theme.faint)
            }
            Spacer(minLength: 0)
        }
        .padding(12)
        .activityCard(cornerRadius: 12)
    }

    private func loadCalendar() async {
        loadingCalendar = true
        calendarError = nil
        defer { loadingCalendar = false }

        guard let client = model.api() else {
            calendarError = String(localized: "Not signed in.")
            return
        }

        do {
            let response = try await client.upcoming()
            upcomingItems = response.items
        } catch let error as APIError {
            calendarError = message(for: error)
        } catch {
            calendarError = String(localized: "Can't reach the server. Try again in a moment.")
        }
    }

    // MARK: Shared

    /// Paints every lane from the last saved responses, so Activity opens full —
    /// offline, or while the refetch is in flight.
    private func hydrateFromCache() {
        guard !hydrated, let client = model.api() else { return }
        hydrated = true
        if queueRows.isEmpty, let list = client.cached(Endpoints.libraryList(status: "downloading")) {
            let downloads = Dictionary(
                list.value.items.map { ($0.id, Self.cachedDownloads(client: client, libraryId: $0.id)) },
                uniquingKeysWith: { first, _ in first }
            )
            queueRows = Self.queueRows(media: list.value.items, downloads: downloads)
        }
        if activities.isEmpty {
            paintHistoryFromCache(client: client)
        }
        if upcomingItems.isEmpty, let cached = client.cached(Endpoints.upcoming) {
            upcomingItems = cached.value.items
        }
    }

    private func loadSpeed() async {
        guard let client = model.api() else { return }
        speed = try? await client.speed()
    }

    private func loadCurrentLane() async {
        switch lane {
        case .queue: await loadQueue()
        case .history: await loadHistory()
        case .calendar: await loadCalendar()
        }
    }

    /// Offline with nothing saved reads as a pause, not a failure.
    @ViewBuilder
    func errorView(_ text: String) -> some View {
        if model.isOffline {
            ContentUnavailableView(
                "You're offline",
                systemImage: "wifi.slash",
                description: Text("This will load when you're back online.")
            )
            .rawkoonLivingSymbol(.error)
            .frame(maxWidth: .infinity, minHeight: 420)
        } else {
            ContentUnavailableView(
                "Something went wrong",
                systemImage: "exclamationmark.triangle",
                description: Text(text)
            )
            .rawkoonLivingSymbol(.error)
            .frame(maxWidth: .infinity, minHeight: 420)
        }
    }

    func message(for error: APIError) -> String {
        error.userMessage(unauthorized: String(localized: "Sign in required."))
    }
}

extension View {
    /// Shared lane-card chrome: raised fill + a hairline border, so queue,
    /// history and calendar cards read as the same surface.
    func activityCard(cornerRadius: CGFloat) -> some View {
        background(Theme.raised, in: RoundedRectangle(cornerRadius: cornerRadius))
            .overlay(RoundedRectangle(cornerRadius: cornerRadius).strokeBorder(Theme.border, lineWidth: 1))
    }

    /// Shared selectable-chip chrome (raised when on, well when off) for the
    /// queue-phase and history-filter chips, which were near-identical.
    func selectableChipChrome(selected: Bool, horizontalPadding: CGFloat) -> some View {
        padding(.horizontal, horizontalPadding)
            .frame(minHeight: 44)
            .background(selected ? Theme.raised : Theme.well, in: Capsule())
            .overlay(Capsule().strokeBorder(selected ? Theme.borderStrong : Theme.border, lineWidth: 1))
    }
}
