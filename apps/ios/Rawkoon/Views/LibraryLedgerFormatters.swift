import Foundation

/// Pure formatters for the library "ledger" row metadata (size, resolution,
/// codec, duration). Ported 1:1 from the web's
/// `apps/web/src/pages/medias/_component/LibraryItemRow.tsx` so native and
/// web read the same numbers the same way. No view code here — consumed by
/// the (later) density row in `LibraryView`.
enum LibraryLedgerFormatters {
    /// `total_size_bytes` is a bigint serialized as a decimal string.
    static func formatBytes(_ bytesString: String?) -> String? {
        guard let bytesString, let n = Double(bytesString), n > 0 else { return nil }
        if n >= 1e12 {
            return String(localized: "\(n / 1e12, specifier: "%.1f") TB")
        }
        if n >= 1e9 {
            return String(localized: "\(n / 1e9, specifier: "%.1f") GB")
        }
        if n >= 1e6 {
            return String(localized: "\(n / 1e6, specifier: "%.1f") MB")
        }
        return String(localized: "\(Int(n)) B")
    }

    /// `resolution` is the source's vertical pixel count (e.g. 1080, 2160).
    static func formatResolution(_ resolution: Int?) -> String? {
        guard let resolution, resolution > 0 else { return nil }
        if resolution >= 2160 {
            return "4K"
        }
        if resolution >= 1080 {
            return "1080p"
        }
        if resolution >= 720 {
            return "720p"
        }
        if resolution >= 576 {
            return "576p"
        }
        return "480p"
    }
}
