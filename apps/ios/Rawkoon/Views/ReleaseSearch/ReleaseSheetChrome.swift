import SwiftUI

/// The chrome the media and book release sheets share. Each sheet keeps its own
/// data path; only the header, the four non-list states, the rejected toggle and
/// the row card live here.
struct ReleaseSheetHeader: View {
    @Environment(\.dismiss) private var dismiss
    let title: LocalizedStringKey
    let subtitle: String
    var detail: String?

    var body: some View {
        VStack(spacing: 0) {
            Capsule()
                .fill(Theme.borderStrong)
                .frame(width: 40, height: 5)
                .padding(.top, 8)

            HStack(alignment: .top) {
                VStack(alignment: .leading, spacing: 4) {
                    Text(title)
                        .font(.display(22))
                        .foregroundStyle(Theme.textStrong)
                    Text(subtitle)
                        .font(.system(.caption, design: .monospaced))
                        .foregroundStyle(Theme.faint)
                        .lineLimit(1)
                    if let detail, !detail.isEmpty {
                        Text(detail)
                            .font(.system(.caption2, design: .monospaced))
                            .foregroundStyle(Theme.muted)
                    }
                }
                .frame(maxWidth: .infinity, alignment: .leading)

                // An explicit close, since a drag over the list must never be what dismisses the sheet.
                Button("Done") { dismiss() }
                    .font(.subheadline.weight(.semibold))
                    .foregroundStyle(Theme.apricot)
                    .frame(minHeight: 44)
            }
            .padding(.horizontal, 16)
            .padding(.top, 6)
            .padding(.bottom, 10)
        }
    }
}

/// Searching, offline, failed and empty: the states a release sheet shows instead of a list.
struct ReleaseSheetStateView: View {
    enum Kind {
        case searching, offline
        case failed(String)
        case empty(String)
    }

    let kind: Kind

    var body: some View {
        Group {
            switch kind {
            case .searching:
                VStack(spacing: 10) {
                    ProgressView().tint(Theme.apricot)
                    Text("Searching…")
                        .font(.subheadline)
                        .foregroundStyle(Theme.muted)
                }
            case .offline:
                ContentUnavailableView {
                    Label("Offline", systemImage: "wifi.slash")
                } description: {
                    Text("Release search needs a connection.")
                }
                .rawkoonLivingSymbol(.error)
            case let .failed(message):
                ContentUnavailableView {
                    Label("Search failed", systemImage: "exclamationmark.triangle")
                } description: {
                    Text(message)
                }
                .rawkoonLivingSymbol(.error)
            case let .empty(description):
                ContentUnavailableView {
                    Label("No releases", systemImage: "magnifyingglass")
                } description: {
                    Text(description)
                }
                .rawkoonLivingSymbol(.empty)
            }
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        .transition(.rawkoonSwap)
    }
}

struct ReleaseRejectedToggle: View {
    @Binding var isShown: Bool

    var body: some View {
        Button(LocalizedStringKey(isShown ? "Hide rejected" : "Show rejected")) {
            withRawkoonMotion(RawkoonMotion.spring) { isShown.toggle() }
        }
        .font(.subheadline)
        .foregroundStyle(Theme.muted)
        .frame(minHeight: 44)
    }
}

extension View {
    /// The raised card every release row sits in.
    func releaseCard(border: Color = Theme.border) -> some View {
        padding(12)
            .background(Theme.raised, in: RoundedRectangle(cornerRadius: 14))
            .overlay(RoundedRectangle(cornerRadius: 14).strokeBorder(border, lineWidth: 1))
    }
}
