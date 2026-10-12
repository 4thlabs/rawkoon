import AVKit
import SwiftUI

/// A 30-second skip whose arrow spins the way it skips; the skip runs first, the spin alongside.
struct SkipControl: View {
    let systemImage: String
    let label: LocalizedStringKey
    let clockwise: Bool
    let action: () -> Void
    @State private var spins = 0

    var body: some View {
        Button {
            action()
            spins += 1
        } label: {
            Image(systemName: systemImage)
                .font(.system(size: 22))
                .foregroundStyle(Theme.textStrong)
                .rawkoonSymbolSpin(spins, clockwise: clockwise)
                .frame(width: 44, height: 44)
                .contentShape(Rectangle())
        }
        .buttonStyle(.plain)
        .accessibilityLabel(label)
    }
}

/// `AVRoutePickerView` has no SwiftUI equivalent.
struct RoutePicker: UIViewRepresentable {
    func makeUIView(context _: Context) -> AVRoutePickerView {
        let view = AVRoutePickerView()
        // AVRoutePickerView is already an accessible button and names itself,
        // so a SwiftUI label on the wrapper would have VoiceOver say it twice.
        // Audio only, so the picker should not rank AirPlay displays first.
        view.prioritizesVideoDevices = false
        view.tintColor = UIColor(Theme.textStrong)
        view.activeTintColor = UIColor(Theme.apricot)
        view.backgroundColor = .clear
        return view
    }

    func updateUIView(_: AVRoutePickerView, context _: Context) {}
}
