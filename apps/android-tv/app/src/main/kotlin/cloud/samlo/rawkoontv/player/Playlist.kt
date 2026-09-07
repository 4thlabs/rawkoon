package cloud.samlo.rawkoontv.player

import cloud.samlo.rawkoontv.data.ManifestDto
import cloud.samlo.rawkoontv.data.resolveUrl

data class PlaylistItem(val mediaUri: String, val title: String, val chapterIndex: Int)

fun buildPlaylist(baseUrl: String, manifest: ManifestDto): List<PlaylistItem> =
    manifest.chapters.sortedBy { it.index }.map { c ->
        PlaylistItem(
            mediaUri = resolveUrl(baseUrl, c.url) ?: c.url,
            title = c.title,
            chapterIndex = c.index,
        )
    }
