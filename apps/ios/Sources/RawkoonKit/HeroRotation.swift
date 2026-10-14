/// Which Home hero slide comes next. Mirrors the web's
/// `pages/_component/heroRotation.ts` so both clients rotate the same way.
public enum HeroRotation {
    public static let rotateSeconds: Double = 8

    /// The slide after `current`, wrapping to the first; 0 when there is nothing to rotate.
    public static func next(after current: Int, count: Int) -> Int {
        guard count > 0 else { return 0 }
        return (clamp(current, count: count) + 1) % count
    }

    /// Keeps a stored index valid when the item count shrinks (or grows from empty).
    public static func clamp(_ index: Int, count: Int) -> Int {
        guard count > 0 else { return 0 }
        return min(max(index, 0), count - 1)
    }
}
