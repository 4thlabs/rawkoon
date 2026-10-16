import RawkoonKit
import SwiftUI

extension MediaDetailView {
    // MARK: Status + primary action (the one lamp)

    /// The status shown as a pill in the hero (was a separate row before the
    /// hero redesign folded it under the title).
    var detailStatusText: String {
        if libraryId != nil || added {
            String(localized: "In library")
        } else if requested {
            String(localized: "Requested")
        } else if inWatchlist {
            String(localized: "Watchlist")
        } else {
            String(localized: "Not added")
        }
    }

    var detailStatusTint: Color {
        (libraryId != nil || added || requested) ? Theme.seed : Theme.muted
    }

    /// The add/request lamp for titles not yet in the library. In-library
    /// "Search releases" is no longer here — it moved into the Management card.
    @ViewBuilder
    var primaryAction: some View {
        if libraryId == nil {
            VStack(alignment: .leading, spacing: 8) {
                if !requested, !added {
                    HStack(spacing: 0) {
                        // On Mac/iPad the lamp sizes to its label and floats right
                        // instead of stretching the whole content width.
                        if isRegularWidth {
                            Spacer(minLength: 0)
                        }
                        lampButton(
                            title: model.isAdmin ? "Add to library" : "Request",
                            systemImage: model.isAdmin ? "plus.circle.fill" : "plus.circle",
                            busy: requesting
                        ) {
                            Task { model.isAdmin ? await submitAdd() : await submitRequest() }
                        }
                        .requiresConnection(model.isOffline)
                        .contextMenu {
                            if model.isAdmin, !model.isOffline {
                                AddModeMenuItems { mode in Task { await submitAdd(mode: mode) } }
                            }
                        }
                    }
                } else if requested {
                    Text("We'll notify you when this is in the library. See Requests in Library.")
                        .font(.footnote)
                        .foregroundStyle(Theme.muted)
                }
                if let requestError {
                    Text(requestError)
                        .font(.caption)
                        .foregroundStyle(Theme.terracotta)
                }
            }
            .padding(.horizontal, 16)
        }
    }

    /// The single apricot lamp: the screen's one primary action.
    func lampButton(
        title: LocalizedStringKey,
        systemImage: String,
        busy: Bool,
        action: @escaping () -> Void
    ) -> some View {
        Button(action: action) {
            Group {
                if busy {
                    ProgressView().tint(Theme.onAccent)
                } else {
                    Label(title, systemImage: systemImage)
                }
            }
            .frame(maxWidth: isRegularWidth ? nil : .infinity)
            .padding(.horizontal, isRegularWidth ? 20 : 0)
            .frame(minHeight: 44)
        }
        .buttonStyle(.borderedProminent)
        .tint(Theme.apricot)
        .foregroundStyle(Theme.onAccent)
        .fontWeight(.semibold)
        .breathingLamp(active: !busy)
        .disabled(busy)
    }
}
