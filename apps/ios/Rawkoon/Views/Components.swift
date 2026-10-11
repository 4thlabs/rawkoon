import RawkoonKit
import SwiftUI

/// Cover art with the rawkoon "book spine" edge — a dark strip down the left,
/// so even a plain gradient placeholder reads as a book on a shelf.
struct BookCover: View {
    let url: URL?
    var size: CGFloat
    var corner: CGFloat = 10
    var zoomID: RawkoonZoom.ID?

    var body: some View {
        ZStack(alignment: .leading) {
            CachedAsyncImage(url: url, targetSize: CGSize(width: size, height: size)) { image in
                image.resizable().scaledToFill()
            } placeholder: {
                LinearGradient(
                    colors: [Theme.terracottaDeep, Theme.apricot],
                    startPoint: .topLeading, endPoint: .bottomTrailing
                )
            }
            .frame(width: size, height: size)
            .clipped()

            Rectangle()
                .fill(.black.opacity(0.28))
                .frame(width: max(3, size * 0.05))
        }
        .frame(width: size, height: size)
        .clipShape(RoundedRectangle(cornerRadius: corner))
        .overlay(
            RoundedRectangle(cornerRadius: corner).strokeBorder(.white.opacity(0.06), lineWidth: 1)
        )
        .rawkoonZoomSource(zoomID)
    }
}

/// A film/TV poster thumbnail — a plain 2:3 poster with no book-spine edge, for
/// rows and calendars where `BookCover` (which draws a spine) would wrongly
/// make a movie read as a book. Width-driven; height is the 2:3 counterpart.
struct MediaThumb: View {
    let url: URL?
    var width: CGFloat
    var corner: CGFloat = 8

    var body: some View {
        Rectangle()
            .fill(Theme.raised)
            .overlay {
                CachedAsyncImage(url: url, targetSize: CGSize(width: width * 2, height: width * 3)) { image in
                    image.resizable().scaledToFill()
                } placeholder: {
                    Image(systemName: "photo")
                        .font(.caption)
                        .foregroundStyle(Theme.faint)
                }
            }
            .frame(width: width, height: width * 3 / 2)
            .clipShape(RoundedRectangle(cornerRadius: corner))
            .overlay(
                RoundedRectangle(cornerRadius: corner).strokeBorder(.white.opacity(0.05), lineWidth: 1)
            )
    }
}

extension View {
    /// The state-pill chrome StatusBadge uses — tinted fill + hairline in a
    /// Capsule — as a modifier, for the few chips that carry custom content
    /// (a non-monospaced label, an icon) and can't be a plain `StatusBadge`.
    func chipCapsule(tint: Color) -> some View {
        padding(.horizontal, 8)
            .padding(.vertical, 3)
            .background(tint.opacity(0.12), in: Capsule())
            .overlay(Capsule().strokeBorder(tint.opacity(0.3), lineWidth: 1))
    }
}

/// A monospaced state pill. Semantic tint (green present, apricot active, …)
/// carries meaning at a glance so a list is scannable without reading it.
struct StatusBadge: View {
    private let text: Text
    var tint: Color = Theme.apricot

    init(text: LocalizedStringKey, tint: Color = Theme.apricot) {
        self.text = Text(text)
        self.tint = tint
    }

    /// Runtime / server tokens. A `String`/`StringProtocol` `text:` init would
    /// steal string literals from the `LocalizedStringKey` overload, so catalog
    /// keys like `In library` would render verbatim.
    init(verbatim: String, tint: Color = Theme.apricot) {
        text = Text(verbatim: verbatim)
        self.tint = tint
    }

    var body: some View {
        text
            .font(.system(.caption2, design: .monospaced))
            .fontWeight(.medium)
            .foregroundStyle(tint)
            .padding(.horizontal, 9)
            .padding(.vertical, 4)
            .background(tint.opacity(0.12), in: Capsule())
            .overlay(Capsule().strokeBorder(tint.opacity(0.3), lineWidth: 1))
            .transition(.rawkoonSwap)
    }
}

/// The Cozy Dusk progress bar: a well groove with a terracotta→apricot fill.
struct DuskProgress: View {
    @Environment(\.accessibilityReduceMotion) private var reduceMotion
    /// 0...1
    let value: Double
    /// True while the work behind the bar is running; adds a moving sheen.
    var isActive = false

    private var clamped: Double {
        max(0, min(1, value))
    }

    var body: some View {
        GeometryReader { geo in
            ZStack(alignment: .leading) {
                Capsule().fill(Theme.well)
                Capsule()
                    .fill(Theme.progress)
                    .overlay {
                        if isActive, !reduceMotion {
                            ProgressSheen()
                        }
                    }
                    .clipShape(Capsule())
                    .frame(width: clamped * geo.size.width)
            }
        }
        .frame(height: 5)
        .rawkoonMotion(RawkoonMotion.progress, value: clamped)
    }
}

/// The one media poster card, shared by Home rails, the library grid, and
/// Similar. A 2:3 poster with the title (and optional date / episode) in a
/// bottom glass panel — never captioned underneath — plus an optional
/// top-trailing overlay (flag/badge) and an optional context menu. Pass `width`
/// for a fixed-size rail card; leave it nil to fill a grid cell.
struct MediaPosterCard<Overlay: View>: View {
    let title: String
    let posterURL: URL?
    var date: String?
    var episode: String?
    var width: CGFloat?
    var corner: CGFloat = 16
    var menuItems: [MediaPosterMenuAction] = []
    var onMenuAction: (MediaPosterMenuAction) -> Void = { _ in }
    @ViewBuilder var overlay: Overlay

    init(
        title: String,
        posterURL: URL?,
        date: String? = nil,
        episode: String? = nil,
        width: CGFloat? = nil,
        corner: CGFloat = 16,
        menuItems: [MediaPosterMenuAction] = [],
        onMenuAction: @escaping (MediaPosterMenuAction) -> Void = { _ in },
        @ViewBuilder overlay: () -> Overlay = { EmptyView() }
    ) {
        self.title = title
        self.posterURL = posterURL
        self.date = date
        self.episode = episode
        self.width = width
        self.corner = corner
        self.menuItems = menuItems
        self.onMenuAction = onMenuAction
        self.overlay = overlay()
    }

    @ViewBuilder
    var body: some View {
        if menuItems.isEmpty {
            posterStack
        } else {
            posterStack.contextMenu {
                ForEach(menuItems, id: \.self) { action in
                    mediaPosterMenuButton(action, perform: onMenuAction)
                }
            }
        }
    }

    private var posterStack: some View {
        let shape = RoundedRectangle(cornerRadius: corner, style: .continuous)
        return Rectangle()
            .fill(Theme.raised)
            .aspectRatio(2.0 / 3.0, contentMode: .fit)
            .frame(width: width)
            .frame(maxWidth: width == nil ? .infinity : nil)
            .overlay {
                CachedAsyncImage(url: posterURL, targetSize: CGSize(width: 160, height: 240)) { image in
                    image.resizable().scaledToFill()
                } placeholder: {
                    Image(systemName: "photo")
                        .font(.title3)
                        .foregroundStyle(Theme.faint)
                }
            }
            .overlay {
                LinearGradient(
                    colors: [.black.opacity(0.55), .black.opacity(0.08), .clear],
                    startPoint: .bottom,
                    endPoint: .center
                )
                .allowsHitTesting(false)
            }
            .overlay(alignment: .bottom) { caption }
            .overlay(alignment: .topTrailing) { overlay.padding(6) }
            .clipShape(shape)
            .overlay(shape.strokeBorder(.white.opacity(0.08), lineWidth: 1))
            .contentShape(shape)
            .accessibilityElement(children: .combine)
            .accessibilityLabel([title, date, episode].compactMap(\.self).joined(separator: ", "))
    }

    private var caption: some View {
        VStack(alignment: .leading, spacing: 4) {
            Text(title)
                .font(.caption.weight(.semibold))
                .foregroundStyle(.white)
                .lineLimit(2)
                .minimumScaleFactor(0.8)
            if date != nil || episode != nil {
                HStack(alignment: .firstTextBaseline, spacing: 6) {
                    if let date {
                        Text(date)
                            .font(.caption2.weight(.medium))
                            .foregroundStyle(.white.opacity(0.7))
                    }
                    Spacer(minLength: 0)
                    if let episode {
                        Text(episode)
                            .font(.caption2.weight(.semibold))
                            .foregroundStyle(Theme.apricot)
                    }
                }
                .lineLimit(1)
                .minimumScaleFactor(0.8)
            }
        }
        .padding(.horizontal, 10)
        .padding(.top, 8)
        .padding(.bottom, 10)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background {
            Rectangle()
                .fill(.ultraThinMaterial)
                .environment(\.colorScheme, .dark)
                .overlay(Color.black.opacity(0.32))
        }
    }
}
