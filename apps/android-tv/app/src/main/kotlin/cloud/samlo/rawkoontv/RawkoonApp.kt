package cloud.samlo.rawkoontv

import android.app.Application
import coil.ImageLoader
import coil.ImageLoaderFactory
import coil.disk.DiskCache
import coil.memory.MemoryCache

/**
 * Global Coil config tuned for weak TV SoCs: RGB_565 covers (half the memory
 * and decode cost, no alpha needed for posters), a big in-memory cache so
 * scrolling back doesn't re-decode, a disk cache, and no crossfade.
 */
class RawkoonApp : Application(), ImageLoaderFactory {
    override fun newImageLoader(): ImageLoader =
        ImageLoader.Builder(this)
            .allowRgb565(true)
            .crossfade(false)
            .memoryCache {
                MemoryCache.Builder(this).maxSizePercent(0.30).build()
            }
            .diskCache {
                DiskCache.Builder()
                    .directory(cacheDir.resolve("image_cache"))
                    .maxSizeBytes(150L * 1024 * 1024)
                    .build()
            }
            .build()
}
