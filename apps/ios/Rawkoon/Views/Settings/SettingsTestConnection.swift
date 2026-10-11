import SwiftUI

enum TestOutcome: Equatable {
    case success(String?)
    case failure(String)
}

struct TestConnectionButton: View {
    @Environment(AppModel.self) private var model
    private let title: Text
    let action: () async -> TestOutcome
    @State private var state: TestState = .idle

    enum TestState: Equatable { case idle, running, ok(String?), failed(String) }

    init(title: LocalizedStringKey = "Test connection", action: @escaping () async -> TestOutcome) {
        self.title = Text(title)
        self.action = action
    }

    init(title: some StringProtocol, action: @escaping () async -> TestOutcome) {
        self.title = Text(title)
        self.action = action
    }

    var body: some View {
        VStack(alignment: .leading, spacing: 6) {
            Button {
                Task {
                    withRawkoonMotion(RawkoonMotion.snappy) { state = .running }
                    let outcome = await action()
                    RawkoonHaptics.play(outcome.haptic)
                    withRawkoonMotion(RawkoonMotion.spring) { state = TestState(outcome) }
                }
            } label: {
                HStack {
                    if state == .running {
                        ProgressView().tint(Theme.apricot)
                            .transition(.rawkoonSwap)
                    }
                    title
                }
            }
            .tint(Theme.apricot)
            .disabled(state == .running)
            .requiresConnection(model.isOffline)

            // One slot, so a new result reveals where the last one was.
            ZStack(alignment: .leading) {
                switch state {
                case let .ok(message):
                    Group {
                        if let message {
                            Text(message).font(.footnote).foregroundStyle(Theme.apricot)
                        } else {
                            Text("Connected").font(.footnote).foregroundStyle(Theme.apricot)
                        }
                    }
                    .transition(.rawkoonReveal)
                case let .failed(message):
                    Text(message).font(.footnote).foregroundStyle(Theme.terracotta)
                        .transition(.rawkoonReveal)
                default:
                    EmptyView()
                }
            }
        }
        .listRowBackground(Theme.raised)
    }
}

extension TestOutcome {
    /// One haptic per test result; none of the callers toasts, so this is the only one.
    var haptic: RawkoonHaptics.Event {
        switch self {
        case .success: .success
        case .failure: .error
        }
    }
}

extension TestConnectionButton.TestState {
    init(_ outcome: TestOutcome) {
        switch outcome {
        case let .success(message): self = .ok(message)
        case let .failure(message): self = .failed(message)
        }
    }
}
