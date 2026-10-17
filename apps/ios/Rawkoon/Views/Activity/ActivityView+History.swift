import RawkoonKit
import SwiftUI

/// History rows, filters, and pagination.
extension ActivityView {
    // MARK: History

    var historyContent: some View {
        VStack(spacing: 12) {
            historyFilterBar

            // One slot, so the outgoing state never stacks above the incoming one.
            ZStack(alignment: .top) {
                if loadingHistory, activities.isEmpty {
                    historySkeleton
                        .transition(.rawkoonSwap)
                } else if let historyError, activities.isEmpty {
                    errorView(historyError)
                        .transition(.rawkoonSwap)
                } else if activities.isEmpty {
                    ContentUnavailableView(
                        "No recent activity",
                        systemImage: "clock.arrow.circlepath",
                        description: Text("Nothing has happened yet.")
                    )
                    .rawkoonLivingSymbol(.empty)
                    .frame(maxWidth: .infinity, minHeight: 360)
                    .transition(.rawkoonSwap)
                } else {
                    historyList
                        .transition(.rawkoonSwap)
                }
            }
            .rawkoonMotion(
                historyInitialLoadResolved ? RawkoonMotion.spring : nil,
                value: Self.laneState(loading: loadingHistory, failed: historyError != nil, isEmpty: activities.isEmpty)
            )
            .onChange(of: Self.laneState(
                loading: loadingHistory, failed: historyError != nil, isEmpty: activities.isEmpty
            )) { _, current in
                if current != .loading {
                    historyInitialLoadResolved = true
                }
            }
        }
        .padding(16)
    }

    private var historyList: some View {
        LazyVStack(spacing: 8) {
            ForEach(Array(activities.enumerated()), id: \.offset) { offset, activity in
                historyRow(activity)
                    .rawkoonEntrance(id: activity.id ?? -(offset + 1))
                    .onAppear {
                        // Trigger on the row's own identity, not its offset: an
                        // offset-keyed ForEach re-fires `onAppear` for whichever
                        // row currently sits at the "last" offset, which with
                        // SwiftUI's double-fire could cancel a load that's
                        // already in flight and stall pagination.
                        guard historyHasMore, !loadingMoreHistory, loadMoreTask == nil,
                              let id = activity.id, id == activities.last?.id
                        else { return }
                        loadMoreTask = Task {
                            await loadMoreHistory()
                            loadMoreTask = nil
                        }
                    }
            }
            if loadingMoreHistory {
                historySkeletonRow
            }
        }
        .rawkoonEntranceScope()
        .rawkoonMotion(RawkoonMotion.gentle, value: activities.count)
    }

    private func historyRow(_ activity: ActivityRecord) -> some View {
        let presentation = ActivityPresentation.make(for: activity)
        return HStack(alignment: .top, spacing: 12) {
            Image(systemName: presentation.symbol)
                .font(.system(size: 15, weight: .semibold))
                .foregroundStyle(presentation.tint)
                .frame(width: 36, height: 36)
                .background(presentation.tint.opacity(0.15), in: RoundedRectangle(cornerRadius: 10))

            VStack(alignment: .leading, spacing: 6) {
                Text(presentation.description)
                    .font(.subheadline)
                    .foregroundStyle(Theme.text)
                    .fixedSize(horizontal: false, vertical: true)

                HStack(spacing: 6) {
                    metaPill(presentation.serviceLabel, tint: presentation.tint)
                    metaPill(presentation.typeLabel, tint: Theme.muted)
                    Spacer(minLength: 0)
                    if !presentation.time.isEmpty {
                        Text(presentation.time)
                            .font(.system(.caption2, design: .monospaced))
                            .foregroundStyle(Theme.faint)
                    }
                }
            }
        }
        .padding(12)
        .activityCard(cornerRadius: 12)
    }

    private func metaPill(_ text: String, tint: Color) -> some View {
        Text(text)
            .font(.system(.caption2, design: .rounded).weight(.medium))
            .foregroundStyle(tint)
            .chipCapsule(tint: tint)
    }

    // MARK: History filters

    @ViewBuilder
    private var historyFilterBar: some View {
        if !availableServices.isEmpty || !availableTypes.isEmpty {
            VStack(alignment: .leading, spacing: 10) {
                if !availableServices.isEmpty {
                    filterRow(
                        title: "Service",
                        options: availableServices,
                        selected: serviceFilter,
                        label: { ActivityPresentation.serviceLabel(for: $0) },
                        onTap: { option in
                            serviceFilter = serviceFilter == option ? nil : option
                            applyHistoryFilter()
                        }
                    )
                }
                if !availableTypes.isEmpty {
                    filterRow(
                        title: "Type",
                        options: availableTypes,
                        selected: typeFilter,
                        label: { ActivityPresentation.typeLabel(for: $0) },
                        onTap: { option in
                            typeFilter = typeFilter == option ? nil : option
                            applyHistoryFilter()
                        }
                    )
                }
            }
        }
    }

    private func filterRow(
        title: LocalizedStringKey,
        options: [String],
        selected: String?,
        label: @escaping (String) -> String,
        onTap: @escaping (String) -> Void
    ) -> some View {
        VStack(alignment: .leading, spacing: 6) {
            Text(title)
                .font(.system(.caption2, design: .monospaced))
                .foregroundStyle(Theme.faint)
                .padding(.leading, 2)
            ScrollView(.horizontal, showsIndicators: false) {
                HStack(spacing: 8) {
                    ForEach(options, id: \.self) { option in
                        filterChip(label(option), selected: selected == option) {
                            onTap(option)
                        }
                    }
                }
            }
        }
    }

    private func filterChip(_ label: String, selected: Bool, action: @escaping () -> Void) -> some View {
        Button(action: action) {
            Text(label)
                .font(.system(.caption, design: .rounded).weight(.medium))
                .foregroundStyle(selected ? Theme.textStrong : Theme.faint)
                .selectableChipChrome(selected: selected, horizontalPadding: 14)
        }
        .buttonStyle(.plain)
    }

    private var historySkeleton: some View {
        LazyVStack(spacing: 8) {
            ForEach(0 ..< 6, id: \.self) { _ in
                historySkeletonRow
            }
        }
    }

    private var historySkeletonRow: some View {
        HStack(alignment: .top, spacing: 12) {
            ShimmerView(cornerRadius: 10)
                .frame(width: 36, height: 36)
            VStack(alignment: .leading, spacing: 6) {
                ShimmerView(cornerRadius: 4).frame(height: 13)
                ShimmerView(cornerRadius: 4).frame(width: 140, height: 10)
            }
            Spacer(minLength: 0)
        }
        .padding(12)
        .background(Theme.raised, in: RoundedRectangle(cornerRadius: 12))
    }

    /// A filter tap resets the window to one page and reloads, reusing the
    /// live-reload task slot so it cancels any in-flight reload cleanly.
    private func applyHistoryFilter() {
        historyLimit = Self.historyPageSize
        if let client = model.api() {
            paintHistoryFromCache(client: client)
        }
        liveReloadTask?.cancel()
        loadMoreTask?.cancel()
        liveReloadTask = Task { await loadHistory() }
    }

    func loadHistory() async {
        guard let client = model.api() else {
            historyError = String(localized: "Not signed in.")
            loadingHistory = false
            return
        }
        // Skeleton only on a cold load; a live reload keeps the current rows.
        if activities.isEmpty {
            loadingHistory = true
        }
        historyError = nil
        defer { loadingHistory = false }

        do {
            let feed = try await client.activityFeed(
                limit: historyLimit, service: serviceFilter, type: typeFilter
            )
            if Task.isCancelled {
                return
            }
            applyFeed(feed)
        } catch let error as APIError {
            historyError = message(for: error)
        } catch {
            historyError = String(localized: "Can't reach the server. Try again in a moment.")
        }
    }

    private func applyFeed(_ feed: ActivityFeedResponse) {
        activities = feed.activities
        historyHasMore = feed.hasMore == true
        if let services = feed.availableServices {
            availableServices = services
        }
        if let types = feed.availableTypes {
            availableTypes = types
        }
    }

    /// Swaps in the saved feed for the current filters. Offline with nothing
    /// saved, the rows are cleared so another filter's rows don't pose as these.
    func paintHistoryFromCache(client: APIClient) {
        let endpoint = Endpoints.activityFeed(limit: historyLimit, service: serviceFilter, type: typeFilter)
        if let cached = client.cached(endpoint) {
            applyFeed(cached.value)
        } else if model.isOffline {
            activities = []
            historyHasMore = false
        }
    }

    private func loadMoreHistory() async {
        guard historyHasMore, !loadingMoreHistory, !loadingHistory else { return }
        guard let client = model.api() else { return }
        loadingMoreHistory = true
        defer { loadingMoreHistory = false }

        let nextLimit = historyLimit + Self.historyPageSize
        do {
            let feed = try await client.activityFeed(
                limit: nextLimit, service: serviceFilter, type: typeFilter
            )
            if Task.isCancelled {
                return
            }
            historyLimit = nextLimit
            applyFeed(feed)
        } catch {
            // Keep the rows already on screen if a page fails to load.
        }
    }
}
