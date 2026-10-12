import RawkoonKit
import SwiftUI

// MARK: Audiobook action row

/// Play and its download companion share one height so the row reads as a pair.
enum BookActionMetrics {
    static let height: CGFloat = 54
}

struct BookPlayButtonStyle: ButtonStyle {
    @Environment(\.isEnabled) private var isEnabled

    func makeBody(configuration: Configuration) -> some View {
        configuration.label
            .font(.body.weight(.semibold))
            .foregroundStyle(Theme.onAccent)
            .frame(maxWidth: .infinity)
            .frame(height: BookActionMetrics.height)
            .background(Capsule().fill(Theme.apricot))
            .opacity(isEnabled ? (configuration.isPressed ? 0.85 : 1) : 0.45)
    }
}

struct BookIconButtonStyle: ButtonStyle {
    func makeBody(configuration: Configuration) -> some View {
        configuration.label
            .frame(width: BookActionMetrics.height, height: BookActionMetrics.height)
            .background(Circle().fill(Theme.raised))
            .overlay(Circle().strokeBorder(Theme.borderStrong, lineWidth: 1))
            .scaleEffect(configuration.isPressed ? 0.95 : 1)
            .contentShape(Circle())
    }
}

enum AudiobookDownloadState: Equatable {
    case idle
    case preparing
    case downloading(fraction: Double, done: Int, total: Int)
    case failed(done: Int, total: Int)
    case downloaded

    enum Kind { case idle, preparing, downloading, failed, downloaded }

    var kind: Kind {
        switch self {
        case .idle: .idle
        case .preparing: .preparing
        case .downloading: .downloading
        case .failed: .failed
        case .downloaded: .downloaded
        }
    }

    var accessibilityLabel: LocalizedStringKey {
        switch self {
        case .idle: "Download"
        case .preparing: "Preparing download..."
        case .downloading: "Cancel"
        case .failed: "Retry"
        case .downloaded: "Remove Download"
        }
    }
}

/// The glyph inside the round download button for each state.
struct DownloadStateIcon: View {
    let state: AudiobookDownloadState
    /// Just finished: show a green check before settling on the struck-through arrow.
    var celebrating = false

    var body: some View {
        ZStack {
            switch state {
            case .idle:
                Image(systemName: "arrow.down.to.line")
                    .font(.title3.weight(.semibold))
                    .foregroundStyle(Theme.apricot)
                    .transition(.rawkoonSwap)
            case .preparing:
                ProgressView().tint(Theme.apricot)
                    .transition(.rawkoonSwap)
            case let .downloading(fraction, _, _):
                ZStack {
                    Circle().stroke(Theme.borderStrong, lineWidth: 3)
                    Circle()
                        .trim(from: 0, to: max(0.02, min(1, fraction)))
                        .stroke(Theme.apricot, style: StrokeStyle(lineWidth: 3, lineCap: .round))
                        .rotationEffect(.degrees(-90))
                        .rawkoonMotion(.linear(duration: 0.15), value: fraction)
                    Image(systemName: "stop.fill")
                        .font(.system(size: 12, weight: .bold))
                        .foregroundStyle(Theme.apricot)
                }
                .padding(10)
                .transition(.rawkoonSwap)
            case .failed:
                Image(systemName: "arrow.clockwise")
                    .font(.title3.weight(.semibold))
                    .foregroundStyle(Theme.terracotta)
                    .transition(.rawkoonSwap)
            case .downloaded where celebrating:
                Image(systemName: "checkmark.circle.fill")
                    .font(.title2)
                    .foregroundStyle(Theme.seed)
                    .symbolEffect(.bounce, value: celebrating)
                    .transition(.scale.combined(with: .opacity))
            case .downloaded:
                ZStack {
                    Image(systemName: "arrow.down.to.line")
                        .font(.title3.weight(.semibold))
                        .foregroundStyle(Theme.muted)
                    // A slash cut through the arrow: a background-coloured bar knocks out
                    // the glyph behind it, then the visible bar sits on top.
                    Capsule().fill(Theme.raised).frame(width: 6, height: 30)
                        .rotationEffect(.degrees(45))
                    Capsule().fill(Theme.muted).frame(width: 2.5, height: 30)
                        .rotationEffect(.degrees(45))
                }
                .transition(.rawkoonSwap)
            }
        }
        .rawkoonMotion(RawkoonMotion.snappy, value: state.kind)
        .rawkoonMotion(RawkoonMotion.snappy, value: celebrating)
    }
}
