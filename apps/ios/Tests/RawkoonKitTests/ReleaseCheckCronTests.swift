@testable import RawkoonKit
import Testing

struct ReleaseCheckCronTests {
    @Test func acceptsCommonSchedules() {
        #expect(ReleaseCheckCron.validate("0 */6 * * *") == .ok("0 */6 * * *"))
        #expect(ReleaseCheckCron.validate("  0   3 * * *  ") == .ok("0 3 * * *"))
        #expect(ReleaseCheckCron.validate("*/15 * * * *") == .ok("*/15 * * * *"))
        #expect(ReleaseCheckCron.validate("0 9 * * MON-FRI") == .ok("0 9 * * MON-FRI"))
    }

    @Test func rejectsMalformedAndUnreachable() {
        #expect(ReleaseCheckCron.validate("") == .invalid)
        #expect(ReleaseCheckCron.validate("0 */6 * *") == .invalid)
        #expect(ReleaseCheckCron.validate("61 * * * *") == .invalid)
        #expect(ReleaseCheckCron.validate("0 24 * * *") == .invalid)
        #expect(ReleaseCheckCron.validate("a b c d e") == .invalid)
        #expect(ReleaseCheckCron.validate("0 0 31 2 *") == .invalid)
        #expect(ReleaseCheckCron.validate("0 0 30 FEB *") == .invalid)
        #expect(ReleaseCheckCron.validate("0 0 29 2 *") == .ok("0 0 29 2 *"))
    }

    @Test func enforcesTheMinimumInterval() {
        #expect(ReleaseCheckCron.validate("* * * * *") == .tooFrequent)
        #expect(ReleaseCheckCron.validate("*/10 * * * *") == .tooFrequent)
        #expect(ReleaseCheckCron.validate("0,10 * * * *") == .tooFrequent)
        #expect(ReleaseCheckCron.validate("*/15 * * * *") == .ok("*/15 * * * *"))
    }

    @Test func intervalWrapsAroundMidnight() {
        #expect(ReleaseCheckCron.minInterval("0 0 * * *") == 1440)
        #expect(ReleaseCheckCron.minInterval("0 */6 * * *") == 360)
        #expect(ReleaseCheckCron.minInterval("0 1,23 * * *") == 120)
    }

    @Test func detectsPresets() {
        #expect(ReleaseCheckCron.preset(for: "0 * * * *") == .hourly)
        #expect(ReleaseCheckCron.preset(for: " 0 */6 * * * ") == .every6h)
        #expect(ReleaseCheckCron.preset(for: "0 */12 * * *") == .every12h)
        #expect(ReleaseCheckCron.preset(for: "0 0 * * *") == .daily)
        #expect(ReleaseCheckCron.preset(for: "0 */4 * * *") == nil)
        for preset in ReleaseCheckCron.Preset.allCases {
            #expect(ReleaseCheckCron.validate(preset.cron) == .ok(preset.cron))
        }
    }

    @Test func describesInEnglish() {
        func d(_ s: String) -> String {
            ReleaseCheckCron.describe(s, locale: .en)
        }
        #expect(d("0 * * * *") == "every hour")
        #expect(d("0 */6 * * *") == "every 6 hours")
        #expect(d("30 */4 * * *") == "every 4 hours, at minute 30")
        #expect(d("*/15 * * * *") == "every 15 minutes")
        #expect(d("0 3 * * *") == "every day at 3:00 AM")
        #expect(d("30 18 * * *") == "every day at 6:30 PM")
        #expect(d("0 0 * * *") == "every day at 12:00 AM")
        #expect(d("0 9,21 * * *") == "every day at 9:00 AM and 9:00 PM")
        #expect(d("0 9 * * 1-5") == "every weekday at 9:00 AM")
        #expect(d("0 9 * * 1,3") == "every Monday and Wednesday at 9:00 AM")
        #expect(d("0 9 1,15 * *") == "on the 1st and 15th of each month at 9:00 AM")
    }

    @Test func describesInFrench() {
        func d(_ s: String) -> String {
            ReleaseCheckCron.describe(s, locale: .fr)
        }
        #expect(d("0 * * * *") == "chaque heure")
        #expect(d("0 */6 * * *") == "toutes les 6 heures")
        #expect(d("0 3 * * *") == "chaque jour à 3 h 00")
        #expect(d("0 9 * * 1-5") == "chaque jour de semaine à 9 h 00")
        #expect(d("0 9 1 * *") == "le 1er de chaque mois à 9 h 00")
    }

    @Test func fallsBackToTheRawExpression() {
        #expect(ReleaseCheckCron.describe("5 4 * * 1 ", locale: .en) == "every Monday at 4:05 AM")
        #expect(ReleaseCheckCron.describe("1-5 * 3 * 1", locale: .en) == "1-5 * 3 * 1")
        #expect(ReleaseCheckCron.describe("nonsense", locale: .en) == "nonsense")
    }
}
