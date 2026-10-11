@testable import Rawkoon
import Testing

@MainActor
struct SettingsComponentsSplitRegressionTests {
    @Test func outcomeMapsToHaptic() {
        #expect(TestOutcome.success(nil).haptic == .success)
        #expect(TestOutcome.success("ok").haptic == .success)
        #expect(TestOutcome.failure("boom").haptic == .error)
    }

    @Test func stateMirrorsOutcome() {
        #expect(TestConnectionButton.TestState(.success("v1")) == .ok("v1"))
        #expect(TestConnectionButton.TestState(.success(nil)) == .ok(nil))
        #expect(TestConnectionButton.TestState(.failure("boom")) == .failed("boom"))
    }
}
