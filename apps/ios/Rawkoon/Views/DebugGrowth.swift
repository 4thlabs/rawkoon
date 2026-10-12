#if DEBUG
    // motion-ok-file: debug-only harness
    import SwiftUI

    /// Fixture of the Home library growth card —
    /// `RAWKOON_SCREEN=growthAdmin|growthMember|growthNoBooks`.
    struct DebugGrowth: View {
        let admin: Bool
        let showBooks: Bool

        static let fixture: LibraryGrowth = {
            let counts: [(Int, Int, Int, Int)] = [
                (2, 10, 1, 0), (3, 22, 0, 1), (1, 8, 2, 0), (4, 30, 1, 0), (0, 0, 0, 0), (2, 14, 0, 1),
                (5, 41, 3, 0), (1, 12, 0, 0), (3, 26, 1, 2), (2, 18, 0, 0), (6, 35, 2, 1), (1, 9, 0, 0),
            ]
            let starts = [
                "2026-07-20", "2026-07-27", "2026-08-03", "2026-08-10", "2026-08-17", "2026-08-24",
                "2026-08-31", "2026-09-07", "2026-09-14", "2026-09-21", "2026-09-28", "2026-10-05",
            ]
            let weeks = zip(starts, counts).map { start, c in
                GrowthPeriod(start: start, movies: c.0, episodes: c.1, books: c.2, upgrades: c.3, bytes: (c.0 * 9 + c.1) * 1_000_000_000)
            }
            return LibraryGrowth(
                timezone: "UTC",
                month: GrowthPeriod(start: "2026-10-01", movies: 3, episodes: 21, books: 1, upgrades: 1, bytes: 62_000_000_000),
                previousToDate: GrowthPeriod(start: "2026-09-01", movies: 4, episodes: 30, books: 2, upgrades: 0, bytes: 90_000_000_000),
                previousMonth: GrowthPeriod(start: "2026-09-01", movies: 12, episodes: 80, books: 5, upgrades: 2, bytes: 250_000_000_000),
                weeks: weeks,
                since: "2026-07-29"
            )
        }()

        var body: some View {
            ZStack {
                Theme.base.ignoresSafeArea()
                LibraryGrowthCard(growth: Self.fixture, isAdmin: admin, showBooks: showBooks, selected: 8)
                    .padding(16)
            }
        }
    }
#endif
