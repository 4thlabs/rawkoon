package cloud.samlo.rawkoontv.player

import kotlin.math.abs

class SyncGate(
    private val intervalMs: Long = 15_000,
    private val minDeltaSecs: Double = 1.0,
) {
    private var lastMs: Long = Long.MIN_VALUE
    private var lastPos: Double = Double.NaN

    fun shouldWrite(nowMs: Long, positionSecs: Double, force: Boolean = false): Boolean {
        val movedAtAll = lastPos.isNaN() || abs(positionSecs - lastPos) > 0.0001
        val allow = if (force) {
            movedAtAll
        } else {
            val elapsed = lastMs == Long.MIN_VALUE || (nowMs - lastMs) >= intervalMs
            val movedEnough = lastPos.isNaN() || abs(positionSecs - lastPos) >= minDeltaSecs
            elapsed && movedEnough
        }
        if (allow) { lastMs = nowMs; lastPos = positionSecs }
        return allow
    }
}
