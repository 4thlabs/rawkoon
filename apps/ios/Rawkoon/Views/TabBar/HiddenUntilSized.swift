import SwiftUI

extension View {
    /// Keeps a navigation stack's root invisible until the stack has a real size.
    /// A new stack lays its root out at zero size for its first frames, and drawing
    /// that squeezes every line of text into a sliver before it snaps to full width.
    func hiddenUntilSized() -> some View {
        modifier(HiddenUntilSized())
    }
}

private struct HiddenUntilSized: ViewModifier {
    @State private var sized = false

    func body(content: Content) -> some View {
        ZStack {
            // Takes exactly the proposed size, which content that overflows can't report.
            Color.clear
                .onGeometryChange(for: Bool.self) { $0.size.width > 0 && $0.size.height > 0 } action: { hasSize in
                    guard hasSize, !sized else { return }
                    var transaction = Transaction()
                    transaction.disablesAnimations = true
                    withTransaction(transaction) { sized = true }
                }
            content.opacity(sized ? 1 : 0)
        }
    }
}
