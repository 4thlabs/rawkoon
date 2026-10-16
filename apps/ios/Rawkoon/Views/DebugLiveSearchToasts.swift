#if DEBUG
    // motion-ok-file: debug-only harness
    import RawkoonKit
    import SwiftUI

    /// Every live search toast phase stacked on the app background —
    /// `RAWKOON_SCREEN=liveSearchToasts`.
    struct DebugLiveSearchToasts: View {
        private let phases: [LiveSearchPhase] = [
            .searching,
            .grabbed(release: "Some Movie 2024", quality: "1080p WEB-DL 4.2 GB"),
            .noMatch,
            .held(minutes: 30, targetKeys: ["k"]),
            .skipped(.settingOff),
            .failed(reason: nil)
        ]

        var body: some View {
            ZStack {
                Theme.base.ignoresSafeArea()
                VStack(spacing: 0) {
                    ForEach(Array(phases.enumerated()), id: \.offset) { _, phase in
                        let copy = LiveSearchCopy.render(phase, title: "Some Show")
                        let label = LiveSearchCopy.actionLabel(phase.action)
                        ToastOverlay(
                            toast: Toast(
                                message: copy.message,
                                style: copy.style,
                                action: label.map { ToastAction(label: $0, handler: {}) },
                                showsProgress: phase == .searching
                            ),
                            bottomInset: 0
                        )
                        .frame(height: 78)
                    }
                }
            }
        }
    }
#endif
