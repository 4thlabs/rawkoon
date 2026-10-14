import Foundation

/// A movie or episode that just finished importing, as pushed by the server's
/// `landed` event. `season`/`episode` are nil for a movie, `episode` is nil for a
/// season pack. `ts` is epoch milliseconds.
public struct LandedArrival: Equatable, Sendable, Identifiable {
    public let mediaId: Int
    public let mediaType: String
    public let title: String
    public let posterUrl: String?
    public let season: Int?
    public let episode: Int?
    public let episodeCount: Int?
    public let ts: Int

    public var id: Int {
        mediaId
    }

    public init(
        mediaId: Int,
        mediaType: String,
        title: String,
        posterUrl: String?,
        season: Int?,
        episode: Int?,
        episodeCount: Int?,
        ts: Int
    ) {
        self.mediaId = mediaId
        self.mediaType = mediaType
        self.title = title
        self.posterUrl = posterUrl
        self.season = season
        self.episode = episode
        self.episodeCount = episodeCount
        self.ts = ts
    }

    public var code: String {
        LandedArrivals.episodeCode(season: season, episode: episode)
    }

    /// Re-stamped with the local receipt time, so a skewed device clock can't expire it on arrival.
    public func received(at ts: Int) -> LandedArrival {
        LandedArrival(mediaId: mediaId, mediaType: mediaType, title: title, posterUrl: posterUrl,
                      season: season, episode: episode, episodeCount: episodeCount, ts: ts)
    }

    /// The same arrival shown with the fetched row's title and poster, which honour the user's language.
    public func displayed(title: String, posterUrl: String?) -> LandedArrival {
        LandedArrival(mediaId: mediaId, mediaType: mediaType, title: title, posterUrl: posterUrl ?? self.posterUrl,
                      season: season, episode: episode, episodeCount: episodeCount, ts: ts)
    }
}

/// Which fresh arrivals Home pins and names. Mirrors the web's
/// `landedArrivals.ts`; `now` and `ts` are epoch milliseconds.
public enum LandedArrivals {
    private static let ttl = 30 * 60 * 1000
    private static let cap = 10

    /// Newest first, one entry per media (the newer wins), expired ones dropped, capped.
    public static func insert(_ list: [LandedArrival], _ arrival: LandedArrival, now: Int) -> [LandedArrival] {
        let rest = list.filter { $0.mediaId != arrival.mediaId }
        return Array(fresh([arrival] + rest, now: now).prefix(cap))
    }

    public static func fresh(_ list: [LandedArrival], now: Int) -> [LandedArrival] {
        list.filter { now - $0.ts < ttl }
    }

    /// "S01E04" for an episode, "S02" for a season pack, "" for a movie.
    public static func episodeCode(season: Int?, episode: Int?) -> String {
        guard let season else { return "" }
        let seasonCode = "S" + String(format: "%02d", season)
        guard let episode else { return seasonCode }
        return seasonCode + "E" + String(format: "%02d", episode)
    }
}
