package cloud.samlo.rawkoontv.data

fun resolveUrl(baseUrl: String, raw: String?): String? {
    if (raw.isNullOrBlank()) return null
    if (raw.startsWith("http://") || raw.startsWith("https://")) return raw
    return baseUrl.trimEnd('/') + "/" + raw.trimStart('/')
}
