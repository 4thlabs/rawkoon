import SwiftUI

/// The one filter control for both library tabs: a glass chip that names what is
/// active, plus a clear chip that only exists while something is.
struct LibraryFilterChip<Content: View>: View {
    /// Active values in display order; empty means nothing is filtered.
    let activeLabels: [String]
    let onClear: () -> Void
    @ViewBuilder let content: () -> Content

    private var isActive: Bool {
        !activeLabels.isEmpty
    }

    /// Two values at most so the chip fits a phone; the full list stays in the accessibility label.
    private var displayLabel: String {
        let shown = activeLabels.prefix(2).joined(separator: " · ")
        let hidden = activeLabels.count - 2
        return hidden > 0 ? "\(shown) +\(hidden)" : shown
    }

    var body: some View {
        GlassEffectContainer(spacing: 8) {
            HStack(spacing: 8) {
                Menu {
                    content()
                } label: {
                    HStack(spacing: 6) {
                        Image(systemName: "line.3.horizontal.decrease").font(.caption2)
                        if isActive {
                            Text(displayLabel)
                                .font(.subheadline.weight(.medium))
                                .lineLimit(1)
                                .frame(maxWidth: 96, alignment: .leading)
                        } else {
                            Text("Filters").font(.subheadline.weight(.medium))
                        }
                        Image(systemName: "chevron.down").font(.system(size: 9, weight: .bold))
                    }
                    .foregroundStyle(isActive ? Theme.apricot : Theme.textStrong)
                    .padding(.horizontal, 12)
                    .frame(height: 40)
                    .glassEffect(.regular.interactive(), in: .capsule)
                }
                .accessibilityLabel(isActive ? Text("Filters: \(activeLabels.joined(separator: ", "))") : Text("Filters"))

                if isActive {
                    Button(action: onClear) {
                        Image(systemName: "xmark")
                            .font(.system(size: 11, weight: .bold))
                            .foregroundStyle(Theme.textStrong)
                            .frame(width: 36, height: 36)
                            .glassEffect(.regular.interactive(), in: .circle)
                    }
                    .buttonStyle(.plain)
                    .accessibilityLabel(Text("Clear filters"))
                    .transition(.rawkoonSwap)
                }
            }
        }
        .rawkoonMotion(RawkoonMotion.snappy, value: isActive)
    }
}
