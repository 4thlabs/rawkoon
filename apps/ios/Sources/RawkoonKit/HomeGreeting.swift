/// Which greeting and subtitle Home shows for a given hour and weekday.
/// Mirrors the web's `pages/_component/greeting.ts` so both clients greet the
/// same way at the same hour; the strings stay in the app target.
public enum HomeGreeting {
    public enum Period: Equatable, Sendable {
        case morning, afternoon, evening, night
    }

    public enum Subtitle: Equatable, Sendable {
        case night, weekend, monday, friday, morning, afternoon, evening
    }

    public static func period(hour: Int) -> Period {
        switch hour {
        case 5 ..< 12: .morning
        case 12 ..< 18: .afternoon
        case 18 ..< 23: .evening
        default: .night
        }
    }

    /// `weekday` is `Calendar.component(.weekday)`: 1 = Sunday … 7 = Saturday.
    public static func subtitle(hour: Int, weekday: Int) -> Subtitle {
        let period = period(hour: hour)
        // Late night wins over the day flavour: 2am Saturday is a night, not a weekend.
        if period == .night {
            return .night
        }
        switch weekday {
        case 1, 7: return .weekend
        case 2: return .monday
        case 6: return .friday
        default:
            switch period {
            case .morning: return .morning
            case .afternoon: return .afternoon
            case .evening, .night: return .evening
            }
        }
    }
}
