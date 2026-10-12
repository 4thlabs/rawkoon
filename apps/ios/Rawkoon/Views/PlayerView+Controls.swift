import RawkoonKit
import SwiftUI

extension PlayerView {
    // MARK: Transport

    var transport: some View {
        HStack(spacing: 24) {
            control("backward.end.fill", label: "Previous chapter", action: model.player.prevChapter)
            SkipControl(systemImage: "gobackward.30", label: "Skip back 30 seconds", clockwise: false) {
                model.player.skipBackward(30)
            }

            Button {
                model.player.isPlaying ? model.player.pause() : model.player.play()
            } label: {
                Image(systemName: model.player.isPlaying ? "pause.fill" : "play.fill")
                    .contentTransition(.symbolEffect(.replace))
                    .font(.system(size: 28, weight: .bold))
                    .foregroundStyle(Theme.onAccent)
                    .frame(width: 66, height: 66)
                    .glassEffect(.regular.tint(Theme.apricot).interactive(), in: .circle)
            }
            .buttonStyle(.plain)
            .shadow(color: Theme.apricot.opacity(0.35), radius: 12, y: 6)
            .accessibilityLabel(Text(LocalizedStringKey(model.player.isPlaying ? "Pause" : "Play")))

            SkipControl(systemImage: "goforward.30", label: "Skip forward 30 seconds", clockwise: true) {
                model.player.skipForward(30)
            }
            control("forward.end.fill", label: "Next chapter", action: model.player.nextChapter)
        }
        .padding(.top, 8)
    }

    private func control(_ name: String, label: LocalizedStringKey, action: @escaping () -> Void) -> some View {
        Button(action: action) {
            Image(systemName: name)
                .font(.system(size: 22))
                .foregroundStyle(Theme.textStrong)
                .frame(width: 44, height: 44)
                .contentShape(Rectangle())
        }
        .buttonStyle(.plain)
        .accessibilityLabel(label)
    }

    // MARK: Speed

    var rateMenu: some View {
        Menu {
            ForEach(rates, id: \.self) { rateValue in
                Button("\(rateLabel(rateValue))×") { model.player.setRate(Float(rateValue)) }
            }
        } label: {
            chip(
                title: Text(verbatim: "\(rateLabel(Double(model.player.rate)))×"),
                systemImage: "speedometer",
                emphasized: false
            )
            .rawkoonNumeric(Double(model.player.rate))
        }
        .accessibilityLabel("Playback speed")
        .accessibilityValue("\(rateLabel(Double(model.player.rate)))×")
    }

    var sleepMenu: some View {
        Menu {
            Button("Off") { model.player.setSleep(.off) }
            Button("End of chapter") { model.player.setSleep(.endOfChapter) }
            ForEach([10, 15, 30, 45, 60], id: \.self) { m in
                Button("\(m) min") { model.player.setSleep(.minutes(m)) }
            }
        } label: {
            // One label for every mode, so a mode change and each countdown second roll in place.
            chip(title: sleepText, systemImage: "moon.zzz.fill", emphasized: sleepActive)
                .rawkoonNumeric(PlayerMotion.sleepRollValue(
                    isOff: model.player.sleepMode == .off, remaining: model.player.sleepRemainingSecs
                ))
        }
        .accessibilityLabel("Sleep timer")
        .accessibilityValue(sleepText)
    }

    /// AirPlay, in the player rather than only in Control Center — moving a
    /// book to a HomePod or the car should not mean leaving the app.
    var routeButton: some View {
        RoutePicker()
            .frame(width: 44, height: 44)
            .glassEffect(.regular.interactive(), in: .capsule)
    }

    private func chip(title: Text, systemImage: String, emphasized: Bool) -> some View {
        chipLabel(
            Label {
                title
            } icon: {
                Image(systemName: systemImage)
            },
            emphasized: emphasized
        )
    }

    private func chipLabel(_ label: some View, emphasized: Bool) -> some View {
        label
            .font(.system(.subheadline, design: .monospaced).weight(.medium))
            .foregroundStyle(emphasized ? Theme.apricot : Theme.textStrong)
            .padding(.horizontal, 14)
            .padding(.vertical, 9)
            .glassEffect(.regular.tint(emphasized ? Theme.apricot.opacity(0.25) : nil).interactive(), in: .capsule)
    }

    private var sleepActive: Bool {
        model.player.sleepMode != .off
    }

    /// One `Text` for every mode (no view branches), so it localizes with the in-app language and still rolls in place.
    private var sleepText: Text {
        switch model.player.sleepMode {
        case .off:
            return Text("Sleep")
        case .endOfChapter:
            return Text("Chapter")
        case .minutes:
            if let remaining = model.player.sleepRemainingSecs {
                return Text(verbatim: Formatters.durationTimestampRounded(remaining))
            }
            return Text("Sleep")
        }
    }

    private func rateLabel(_ value: Double) -> String {
        let rounded = (value * 100).rounded() / 100
        if abs(rounded.rounded() - rounded) < 0.001 {
            return String(format: "%.0f", rounded)
        }
        if abs((rounded * 10).rounded() - (rounded * 10)) < 0.001 {
            return String(format: "%.1f", rounded)
        }
        return String(format: "%.2f", rounded)
    }
}
