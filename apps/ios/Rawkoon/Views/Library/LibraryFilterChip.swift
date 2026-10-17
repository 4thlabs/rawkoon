import SwiftUI

/// The one filter control for both library tabs: a glass "Filters" chip with a count
/// of what is active, plus a clear chip that only exists while something is.
struct LibraryFilterChip<Content: View>: View {
    /// Active values in display order; empty means nothing is filtered.
    let activeLabels: [String]
    let onClear: () -> Void
    @ViewBuilder let content: () -> Content

    private var isActive: Bool {
        !activeLabels.isEmpty
    }

    var body: some View {
        GlassEffectContainer(spacing: 8) {
            HStack(spacing: 8) {
                Menu {
                    content()
                } label: {
                    HStack(spacing: 6) {
                        Image(systemName: "line.3.horizontal.decrease").font(.caption2)
                        Text("Filters").font(.subheadline.weight(.medium))
                        if isActive {
                            Text(activeLabels.count, format: .number)
                                .font(.caption2.weight(.bold))
                                .monospacedDigit()
                                .foregroundStyle(Theme.onAccent)
                                .frame(minWidth: 18, minHeight: 18)
                                .background(Theme.apricot, in: .capsule)
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
