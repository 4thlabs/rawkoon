package cloud.samlo.rawkoontv.player

import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

class SyncGateTest {
    @Test fun firstForcedWriteAllowed() {
        val g = SyncGate()
        assertTrue(g.shouldWrite(nowMs = 0, positionSecs = 10.0, force = true))
    }
    @Test fun periodicBlockedBeforeInterval() {
        val g = SyncGate(intervalMs = 15_000)
        assertTrue(g.shouldWrite(0, 0.0, force = true))
        assertFalse(g.shouldWrite(5_000, 5.0))
    }
    @Test fun periodicAllowedAfterIntervalAndMovement() {
        val g = SyncGate(intervalMs = 15_000)
        assertTrue(g.shouldWrite(0, 0.0, force = true))
        assertTrue(g.shouldWrite(16_000, 16.0))
    }
    @Test fun periodicBlockedIfNotMovedEnough() {
        val g = SyncGate(intervalMs = 15_000, minDeltaSecs = 1.0)
        assertTrue(g.shouldWrite(0, 100.0, force = true))
        assertFalse(g.shouldWrite(16_000, 100.4))
    }
    @Test fun forcedBlockedIfNotMovedAtAll() {
        val g = SyncGate()
        assertTrue(g.shouldWrite(0, 50.0, force = true))
        assertFalse(g.shouldWrite(1_000, 50.0, force = true))
    }
}
