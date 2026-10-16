import RawkoonKit
import SwiftUI

/// Home's opening film: a rotating backdrop deck with the greeting overlaid.
/// Home scrolls under the status bar while it shows, so the backdrop reaches
/// the top edge and the text is pushed below the status bar by `topInset`. It
/// has no corners: the bottom fades into the page.
struct HomeHero<Greeting: View>: View {
    @Environment(AppModel.self) private var model
    @Environment(\.accessibilityReduceMotion) private var reduceMotion
    /// Kept-alive tabs never disappear, so the hero must stop itself off-screen.
    @Environment(\.isActiveRootTab) private var isActiveRootTab

    let hero: DashboardHeroResponse
    /// Status-bar height: Home scrolls under it while the hero shows, so the text moves down by this much.
    let topInset: CGFloat
    let greeting: () -> Greeting

    @State private var storedIndex = 0
    /// Bumped per swipe so the haptic fires on a swipe, not on auto-rotation.
    @State private var swipes = 0
    @State private var added: Set<Int> = []
    @State private var adding = false
    @State private var gate = HeroInteractionGate()
    /// Resets itself when the system cancels the touch (a scroll takes over), unlike `onEnded`.
    @GestureState private var fingerDown = false
    /// Bumped on every touch change so the rotation timer restarts from the gate's new answer.
    @State private var gateEpoch = 0
    /// The slide under the finger when it went down; the Add button acts on it even if the slide changes.
    @State private var pressedItemId: String?

    private let height: CGFloat = 460

    init(hero: DashboardHeroResponse, topInset: CGFloat, @ViewBuilder greeting: @escaping () -> Greeting) {
        self.hero = hero
        self.topInset = topInset
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
        var epoch: Int
    }

    private var rotationKey: RotationKey {
        RotationKey(index: index, count: items.count, paused: adding || !isActiveRootTab, epoch: gateEpoch)
    }

    var body: some View {
        if items.indices.contains(index) {
            let item = items[index]
            content(item)
                .frame(height: height + topInset)
                .background {
                    ZStack {
                        backdrop(item)
                            .id(item.id)
                            .transition(.opacity)
                        // Fully page-coloured before the edge, so the film melts into Home without a seam.
                        LinearGradient(
                            stops: [
                                .init(color: .clear, location: 0.45),
                                .init(color: Theme.base.opacity(0.6), location: 0.75),
                                .init(color: Theme.base, location: 0.94),
                            ],
                            startPoint: .top, endPoint: .bottom
                        )
                        LinearGradient(
                            colors: [Theme.base.opacity(0.7), .clear],
                            startPoint: .leading, endPoint: .trailing
                        )
                    }
                    .clipped()
                }
                // Simultaneous so a vertical drag still scrolls Home; only a clearly horizontal one changes slide.
                .simultaneousGesture(
                    DragGesture(minimumDistance: 0)
                        .updating($fingerDown) { _, state, _ in state = true }
                        .onEnded { value in
                            if let target = HeroRotation.swipe(
                                from: index, count: items.count,
                                dx: value.translation.width, dy: value.translation.height
                            ) {
                                select(target)
                                swipes += 1
                            }
                        }
                )
                .onChange(of: fingerDown) { _, down in
                    if down {
                        touchBegan()
                    } else {
                        touchEnded()
                    }
                }
                .sensoryFeedback(RawkoonHaptics.feedback(for: .tap), trigger: swipes)
                .task(id: rotationKey) {
                    await rotate()
                }
        }
    }

    // MARK: Rotation

    private func rotate() async {
        guard !reduceMotion, isActiveRootTab, !adding, items.count > 1 else { return }
        guard let delay = gate.rotationDelay(at: Date()) else {
            // A touch that never reports its end must not freeze the hero for good.
            try? await Task.sleep(for: .seconds(HeroInteractionGate.touchTimeout))
            guard !Task.isCancelled else { return }
            gateEpoch += 1
            return
        }
        try? await Task.sleep(for: .seconds(delay))
        guard !Task.isCancelled, gate.rotationDelay(at: Date()) != nil else { return }
        pressedItemId = nil
        withRawkoonMotion(.easeInOut(duration: 0.9)) {
            storedIndex = HeroRotation.next(after: index, count: items.count)
        }
    }

    private func select(_ newIndex: Int) {
        pressedItemId = nil
        withRawkoonMotion(.easeInOut(duration: 0.9)) { storedIndex = newIndex }
    }

    private func touchBegan() {
        guard !gate.isTouching(at: Date()) else { return }
        if items.indices.contains(index) {
            pressedItemId = items[index].id
        }
        gate.touchBegan(at: Date())
        gateEpoch += 1
    }

    private func touchEnded() {
        gate.touchEnded(at: Date())
        gateEpoch += 1
    }

    // MARK: Layers

    private func backdrop(_ item: DashboardHeroItem) -> some View {
        // An aspect-filled image reports its own (wider) size; as an overlay it can't widen the hero.
        Color.clear
            .overlay {
                KenBurnsBackdrop(url: model.absoluteURL(item.backdropUrl), animates: !reduceMotion && isActiveRootTab)
            }
            .clipped()
    }

    private func content(_ item: DashboardHeroItem) -> some View {
        VStack(alignment: .leading, spacing: 14) {
            greeting()
            Spacer(minLength: 24)
            VStack(alignment: .leading, spacing: 6) {
                Text(kicker(item))
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
            // Two titles fading through each other read as a smear; the old one leaves at once.
            .transition(.asymmetric(insertion: .opacity, removal: .identity))
            // Same swap as the title: a slide's buttons never morph into the next slide's.
            buttons(item)
                .id(item.id)
                .transition(.asymmetric(insertion: .opacity, removal: .identity))
            dots
        }
        .padding(.horizontal, 16)
        .padding(.top, 12 + topInset)
        .padding(.bottom, 18)
        .frame(maxWidth: .infinity, alignment: .leading)
    }

    private func kicker(_ item: DashboardHeroItem) -> LocalizedStringKey {
        switch item.source {
        case .arrivals: "Just arrived"
        case .forYou: "For you"
        case .trending: "Trending"
        }
    }

    private func metaLine(_ item: DashboardHeroItem) -> String? {
        var parts: [String] = []
        if item.source == .arrivals {
            // French abbreviated renders a past time as "-14 min"; the full style reads "il y a 14 minutes".
            let relative = ActivityPresentation.relativeTime(item.arrivedAt, style: .full)
            if !relative.isEmpty {
                parts.append(String(localized: "arrived \(relative)"))
            }
        }
        if let code = item.episodeCode {
            parts.append(code)
        }
        if item.source != .arrivals, let year = item.year {
            parts.append(String(year))
        }
        return parts.isEmpty ? nil : parts.joined(separator: " · ")
    }

    // MARK: Buttons

    private func buttons(_ item: DashboardHeroItem) -> some View {
        HStack(spacing: 12) {
            if item.source != .arrivals {
                addButton(item)
            }
            NavigationLink {
                MediaDetailView(tmdbId: item.tmdbId, mediaType: item.mediaType,
                                title: item.title, posterPath: item.posterUrl, libraryId: item.libraryId)
            } label: {
                pill("Details", primary: item.source == .arrivals)
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
                // The slide the finger landed on, even if the hero moved on before it lifted.
                add(items.first { $0.id == pressedItemId } ?? item)
            } label: {
                pill(model.isAdmin ? "Add" : "Request", primary: true)
            }
            .buttonStyle(HeroPressStyle(onDown: { touchBegan() }, onUp: { touchEnded() }))
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

/// A pressable style that reports touch-down and release, so the hero can pin the slide under the finger.
private struct HeroPressStyle: ButtonStyle {
    let onDown: () -> Void
    let onUp: () -> Void

    func makeBody(configuration: Configuration) -> some View {
        configuration.label
            .scaleEffect(configuration.isPressed ? 0.96 : 1)
            .onChange(of: configuration.isPressed) { _, pressed in
                if pressed {
                    onDown()
                } else {
                    onUp()
                }
            }
    }
}
