import RawkoonKit
import SwiftUI

/// One indexer in the seeding rules list: shows the rule that applies (its own
/// override or the inherited default) and lets an admin customize or reset it.
struct SeedIndexerRuleRow: View {
    @Environment(AppModel.self) private var model

    let row: IndexerSeedRuleRowDTO
    let onChange: () async -> Void

    @State private var editing = false
    @State private var ratioText = ""
    @State private var daysText = ""
    /// The text the days field was prefilled with and the minutes behind it; untouched, they are saved as stored.
    @State private var storedDays = (text: "", minutes: Int?.none)
    @State private var busy = false

    private var parsed: SeedRule? {
        let minutes: Int?
        switch SeedTimeDays.resolve(text: daysText, loadedText: storedDays.text, loadedMinutes: storedDays.minutes) {
        case .invalid: return nil
        case .none: minutes = nil
        case let .minutes(value): minutes = value
        }
        return SeedRuleLogic.rule(ratio: SeedRuleLogic.parseRatio(ratioText), seedTimeMins: minutes)
    }

    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            HStack {
                HStack(spacing: 4) {
                    if row.isPrivate {
                        Image(systemName: "lock.fill").imageScale(.small)
                    }
                    Text(row.indexer).fontWeight(.medium)
                }
                Spacer()
                Text("\(row.heldCount) seeding")
                    .font(.caption).foregroundStyle(Theme.muted)
            }
            if editing {
                LabeledTextFieldRow(title: "Ratio", text: $ratioText, placeholder: "none", keyboard: .decimalPad)
                LabeledTextFieldRow(title: "Days", text: $daysText, placeholder: "none", keyboard: .decimalPad)
                HStack {
                    Button("Save") { Task { await save() } }
                        .disabled(parsed == nil || busy)
                        .buttonStyle(.borderedProminent)
                    Button("Cancel") { editing = false }
                        .buttonStyle(.bordered)
                }
            } else {
                HStack {
                    ruleLabel
                    Spacer()
                    if row.override != nil {
                        Button("Use default") { Task { await reset() } }.disabled(busy)
                    } else {
                        Button("Customize") {
                            ratioText = SeedRuleLogic.ratioText(row.effective.ratio)
                            daysText = SeedTimeDays.text(forMinutes: row.effective.seedTimeMins)
                            storedDays = (daysText, row.effective.seedTimeMins)
                            editing = true
                        }
                    }
                }
                .font(.footnote)
            }
        }
        .listRowBackground(Theme.raised)
        .requiresConnection(model.isOffline)
    }

    @ViewBuilder
    private var ruleLabel: some View {
        if row.override != nil {
            shortLabel(row.effective.rule).foregroundStyle(Theme.apricot)
        } else {
            Text("\(shortLabelString(row.effective.rule)) (default \(row.isPrivate ? String(localized: "private") : String(localized: "public")))")
                .foregroundStyle(Theme.muted)
        }
    }

    private func shortLabel(_ rule: SeedRule) -> Text {
        Text(shortLabelString(rule))
    }

    private func shortLabelString(_ rule: SeedRule) -> String {
        switch SeedRuleLogic.summary(rule) {
        case .releaseOnImport:
            String(localized: "On import")
        case let .ratio(ratio):
            String(localized: "Ratio \(SeedRuleLogic.formatRatio(ratio))")
        case let .time(minutes):
            String(localized: "After \(seedDurationText(minutes))")
        case let .ratioOrTime(ratio, minutes):
            String(localized: "Ratio \(SeedRuleLogic.formatRatio(ratio)) or \(seedDurationText(minutes))")
        }
    }

    private func save() async {
        guard let client = model.api(), let rule = parsed else { return }
        busy = true
        do {
            try await client.saveSeedRule(
                indexer: row.indexer,
                UpsertSeedRuleBody(ratio: rule.ratio, seedTimeMins: rule.seedTimeMins)
            )
            editing = false
            await onChange()
        } catch {
            model.toast(String(localized: "Couldn't save the rule."), style: .error)
        }
        busy = false
    }

    private func reset() async {
        guard let client = model.api() else { return }
        busy = true
        do {
            try await client.deleteSeedRule(indexer: row.indexer)
            await onChange()
        } catch {
            model.toast(String(localized: "Couldn't reset the rule."), style: .error)
        }
        busy = false
    }
}
