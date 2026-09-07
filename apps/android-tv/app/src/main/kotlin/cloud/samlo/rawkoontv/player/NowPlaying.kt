package cloud.samlo.rawkoontv.player

import kotlinx.coroutines.flow.MutableStateFlow

data class NowPlayingInfo(val editionId: Int, val title: String, val coverUrl: String?)

/** Session-global "what's playing", so the library can show a reopen chip. */
object NowPlaying {
    val current = MutableStateFlow<NowPlayingInfo?>(null)
}

/** Which edition the service's ExoPlayer actually has loaded, so reopening the
 *  same book reconnects seamlessly instead of rebuilding the playlist. */
object PlaybackState {
    @Volatile var loadedEditionId: Int? = null
}
