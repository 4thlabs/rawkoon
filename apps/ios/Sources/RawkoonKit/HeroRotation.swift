/// Which Home hero slide comes next. `next`/`clamp` mirror the web's
/// `pages/_component/heroRotation.ts`; swiping is iOS-only.
public enum HeroRotation {
    public static let rotateSeconds: Double = 8

    /// Shortest horizontal travel, in points, that counts as a swipe.
    public static let swipeMinimum: Double = 50

    /// The slide after `current`, wrapping to the first; 0 when there is nothing to rotate.
    public static func next(after current: Int, count: Int) -> Int {
        guard count > 0 else { return 0 }
        return (clamp(current, count: count) + 1) % count
    }

    /// The slide before `current`, wrapping to the last; 0 when there is nothing to rotate.
    public static func previous(before current: Int, count: Int) -> Int {
        guard count > 0 else { return 0 }
        return (clamp(current, count: count) - 1 + count) % count
    }

    /// The slide a swipe lands on: left is next, right is previous. Nil for a short,
    /// mostly vertical (a scroll) or single-slide drag.
    public static func swipe(from current: Int, count: Int, dx: Double, dy: Double) -> Int? {
        guard count > 1, abs(dx) >= swipeMinimum, abs(dx) > abs(dy) * 1.2 else { return nil }
        return dx < 0 ? next(after: current, count: count) : previous(before: current, count: count)
    }

    /// Keeps a stored index valid when the item count shrinks (or grows from empty).
    public static func clamp(_ index: Int, count: Int) -> Int {
        guard count > 0 else { return 0 }
        return min(max(index, 0), count - 1)
    }
}
