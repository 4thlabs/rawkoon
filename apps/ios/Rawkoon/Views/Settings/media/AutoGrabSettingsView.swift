import RawkoonKit
import SwiftUI

/// Automatic grabbing (admin): search on add, how often wanted titles are
/// re-checked, whether the pipeline is ready, and releases held by a grab delay.
/// `GET/PATCH /api/library/post-processing/settings`, `.../grab-readiness`,
/// `/api/downloads/pending-releases`.
struct AutoGrabSettingsView: View {
    @Environment(AppModel.self) private var model

    private enum Schedule: Hashable {
        case preset(ReleaseCheckCron.Preset)
        case custom
    }

    @State private var loading = true
    @State private var loadError: String?
    @State private var saving = false
    @State private var saveError: String?

    @State private var searchOnAdd = true
    @State private var schedule: Schedule = .preset(.every6h)
    @State private var customCron = ""
    @State private var loaded: Saved?

    @State private var checks: [GrabReadinessCheck]?
    @State private var checksFailed = false
    @State private var held: [PendingRelease]?
    @State private var heldFailed = false
    @State private var grabbingKey: String?

    private struct Saved: Equatable {
        var searchOnAdd: Bool
        var cron: String
    }

    private var cronText: String {
        switch schedule {
        case let .preset(preset): preset.cron
        case .custom: customCron
        }
    }

    private var validation: ReleaseCheckCron.Validation {
        ReleaseCheckCron.validate(cronText)
    }

    private var effectiveCron: String? {
        if case let .ok(cron) = validation { cron } else { nil }
    }

    private var isDirty: Bool {
        guard let loaded, let effectiveCron else { return loaded != nil }
        return loaded != Saved(searchOnAdd: searchOnAdd, cron: effectiveCron)
    }

    private var canSave: Bool {
        isDirty && effectiveCron != nil
    }

    private var cronLocale: CronLocale {
        AppLanguage.resolvedTitleCode == "fr" ? .fr : .en
    }

    var body: some View {
        Group {
            if !model.isAdmin {
                ContentUnavailableView("Admin only", systemImage: "lock")
                    .rawkoonLivingSymbol(.empty)
            } else {
                form
            }
        }
        .navigationTitle("Automatic grabbing")
        .navigationBarTitleDisplayMode(.inline)
    }

    private var form: some View {
        Form {
            SettingsStateView(isLoading: loading, error: loadError, retry: { Task { await load() } }) {
                Section {
                    ToggleRow(
                        "Search when a title is added",
                        isOn: $searchOnAdd,
                        subtitle: "Look for a release and grab the best match right after you add a movie or show."
                    )
                } footer: {
                    Text(searchOnAdd
                        ? "Search starts as soon as a title is added."
                        : "A new title waits for the scheduled check, or a manual search.")
                }

                scheduleSection
                readinessSection
                heldSection

                if let saveError {
                    Section { Text(saveError).foregroundStyle(Theme.terracotta) }
                        .listRowBackground(Theme.raised)
                }
            }
        }
        .settingsScreenStyle()
        .refreshable { await refreshLive() }
        .toolbar {
            ToolbarItem(placement: .topBarTrailing) {
                if saving {
                    ProgressView().tint(Theme.apricot)
                } else {
                    Button("Save") { Task { await save() } }
                        .disabled(!canSave)
                        .requiresConnection(model.isOffline)
                }
            }
        }
        .task { await load() }
    }

    // MARK: Schedule

    private var scheduleSection: some View {
        Section {
            ForEach(ReleaseCheckCron.Preset.allCases, id: \.self) { preset in
                scheduleRow(.preset(preset), title: presetTitle(preset))
            }
            scheduleRow(
                .custom,
                title: "Custom\u{2026}",
                subtitle: schedule == .custom ? customSubtitle : nil
            )
            if schedule == .custom {
                LabeledTextFieldRow(
                    title: "Cron expression",
                    text: $customCron,
                    placeholder: "0 */4 * * *",
                    mono: true
                )
                .accessibilityIdentifier("autograb-cron-field")
                customFeedback
            }
        } header: {
            Text("Check for new releases")
        } footer: {
            VStack(alignment: .leading, spacing: 4) {
                Text("How often wanted movies and episodes are searched for a release.")
                if schedule == .custom {
                    Text("Five fields: minute, hour, day of month, month, day of week. Times follow the server's time zone.")
                }
            }
        }
    }

    private func presetTitle(_ preset: ReleaseCheckCron.Preset) -> LocalizedStringKey {
        switch preset {
        case .hourly: "Every hour"
        case .every6h: "Every 6 hours"
        case .every12h: "Every 12 hours"
        case .daily: "Every 24 hours"
        }
    }

    private var customSubtitle: String? {
        guard case .ok = validation else { return nil }
        return String(localized: "Custom: \(ReleaseCheckCron.describe(cronText, locale: cronLocale))")
    }

    @ViewBuilder
    private var customFeedback: some View {
        Group {
            switch validation {
            case .ok:
                Text("Runs \(ReleaseCheckCron.describe(cronText, locale: cronLocale)).")
                    .foregroundStyle(Theme.muted)
            case .tooFrequent:
                Text("This runs too often. Release checks must be at least \(ReleaseCheckCron.minIntervalMinutes) minutes apart.")
                    .foregroundStyle(Theme.terracotta)
            case .invalid:
                Text("This is not a valid cron expression. Use five fields, for example 0 */4 * * *.")
                    .foregroundStyle(Theme.terracotta)
            }
        }
        .font(.footnote)
        .listRowBackground(Theme.raised)
        .accessibilityIdentifier("autograb-cron-feedback")
    }

    private func scheduleRow(_ value: Schedule, title: LocalizedStringKey, subtitle: String? = nil) -> some View {
        Button {
            if value == .custom, schedule != .custom {
                customCron = cronText
            }
            schedule = value
        } label: {
            HStack {
                VStack(alignment: .leading, spacing: 2) {
                    Text(title).foregroundStyle(Theme.text)
                    if let subtitle {
                        Text(verbatim: subtitle).font(.footnote).foregroundStyle(Theme.muted)
                    }
                }
                Spacer()
                if schedule == value {
                    Image(systemName: "checkmark").foregroundStyle(Theme.apricot)
                }
            }
        }
        .listRowBackground(Theme.raised)
        .accessibilityAddTraits(schedule == value ? .isSelected : [])
    }

    // MARK: Readiness

    private var readinessSection: some View {
        Section {
            if let checks {
                ForEach(GrabReadiness.visible(checks)) { check in
                    readinessRow(check)
                }
            } else if checksFailed {
                Text("Couldn't run the checks.").foregroundStyle(Theme.terracotta).listRowBackground(Theme.raised)
            } else {
                ProgressView().tint(Theme.apricot).listRowBackground(Theme.raised)
            }
            AsyncButton("Re-check") { await refreshChecks() }
                .requiresConnection(model.isOffline)
                .listRowBackground(Theme.raised)
        } header: {
            Text("Ready to grab")
        } footer: {
            if let checks {
                let problems = GrabReadiness.problemCount(checks)
                if problems == 0 {
                    Text("Everything automatic grabbing needs is in place.")
                } else if problems == 1 {
                    Text("1 thing to fix")
                } else {
                    Text("\(problems) things to fix")
                }
            }
        }
    }

    @ViewBuilder
    private func readinessRow(_ check: GrabReadinessCheck) -> some View {
        if let target = fixDestination(check) {
            NavigationLink {
                target.destination
            } label: {
                readinessLabel(check)
            }
            .listRowBackground(Theme.raised)
        } else {
            readinessLabel(check).listRowBackground(Theme.raised)
        }
    }

    private func readinessLabel(_ check: GrabReadinessCheck) -> some View {
        HStack(alignment: .top, spacing: 12) {
            statusIcon(check.status)
            Text(verbatim: AutoGrabText.readiness(check))
                .font(.subheadline)
                .foregroundStyle(Theme.text)
                .fixedSize(horizontal: false, vertical: true)
        }
        .padding(.vertical, 2)
        .accessibilityElement(children: .combine)
        .accessibilityIdentifier("autograb-check-\(check.id)")
    }

    private func statusIcon(_ status: GrabReadinessStatus) -> some View {
        let (name, tint, label): (String, Color, LocalizedStringKey) = switch status {
        case .ok: ("checkmark.circle.fill", Theme.seed, "OK")
        case .warn: ("exclamationmark.triangle.fill", Theme.apricot, "Needs attention")
        case .error: ("xmark.octagon.fill", Theme.terracotta, "Not working")
        }
        return Image(systemName: name)
            .foregroundStyle(tint)
            .font(.system(size: 17))
            .frame(width: 22)
            .accessibilityLabel(label)
    }

    private func fixDestination(_ check: GrabReadinessCheck) -> SettingsDestination? {
        switch check.fix {
        case .indexerManager: check.params.manager == "jackett" ? .jackett : .prowlarr
        case .downloadClient: .downloadClient
        case .defaultProfiles: .mediaLibrary
        case .qualityProfiles: .qualityProfiles
        case nil: nil
        }
    }

    // MARK: Held releases

    private var heldSection: some View {
        Section {
            if let held {
                if held.isEmpty {
                    Text("Nothing is held. A quality profile with a grab delay holds releases here until the delay ends.")
                        .font(.subheadline).foregroundStyle(Theme.muted)
                        .listRowBackground(Theme.raised)
                }
                ForEach(held) { item in
                    heldRow(item)
                }
            } else if heldFailed {
                Text("Couldn't load held releases.").foregroundStyle(Theme.terracotta).listRowBackground(Theme.raised)
            } else {
                ProgressView().tint(Theme.apricot).listRowBackground(Theme.raised)
            }
        } header: {
            Text("Held releases")
        } footer: {
            Text("Set per quality profile under Grab delay. Manual grabs are never held.")
        }
    }

    private func heldRow(_ item: PendingRelease) -> some View {
        VStack(alignment: .leading, spacing: 6) {
            Text(verbatim: item.episodeCode.map { "\(item.mediaTitle) \u{00B7} \($0)" } ?? item.mediaTitle)
                .font(.headline).foregroundStyle(Theme.textStrong)
            Text(verbatim: item.releaseTitle)
                .font(.footnote).foregroundStyle(Theme.muted).lineLimit(2)
            if let date = item.grabAfterDate {
                Text("Grabs \(date.formatted(.relative(presentation: .named))) unless a better release appears.")
                    .font(.footnote).foregroundStyle(Theme.muted)
            }
            Button {
                Task { await grabNow(item) }
            } label: {
                if grabbingKey == item.targetKey {
                    ProgressView().tint(Theme.onAccent)
                } else {
                    Text("Grab now")
                }
            }
            .buttonStyle(.borderedProminent)
            .tint(Theme.apricot)
            .foregroundStyle(Theme.onAccent)
            .disabled(grabbingKey != nil)
            .requiresConnection(model.isOffline)
            .padding(.top, 2)
        }
        .padding(.vertical, 4)
        .listRowBackground(Theme.raised)
    }

    // MARK: Loading

    private func load() async {
        guard let client = model.api() else {
            loading = false
            return
        }
        loading = true
        loadError = nil
        do {
            let settings = try await client.autoGrabSettings()
            searchOnAdd = settings.searchOnAdd ?? true
            let cron = settings.releaseCheckCron ?? ReleaseCheckCron.defaultCron
            if let preset = ReleaseCheckCron.preset(for: cron) {
                schedule = .preset(preset)
                customCron = cron
            } else {
                schedule = .custom
                customCron = cron
            }
            loaded = Saved(searchOnAdd: searchOnAdd, cron: ReleaseCheckCron.normalize(cron) ?? cron)
        } catch {
            loadError = settingsErrorMessage(error)
        }
        loading = false
        await refreshLive()
    }

    private func refreshLive() async {
        async let readiness: Void = refreshChecks()
        async let pending: Void = refreshHeld()
        _ = await (readiness, pending)
    }

    private func refreshChecks() async {
        guard let client = model.api() else { return }
        do {
            checks = try await client.grabReadiness(refresh: true)
            checksFailed = false
        } catch {
            checksFailed = checks == nil
        }
    }

    private func refreshHeld() async {
        guard let client = model.api() else { return }
        do {
            held = try await client.pendingReleases()
            heldFailed = false
        } catch {
            heldFailed = held == nil
        }
    }

    private func save() async {
        guard let client = model.api(), let cron = effectiveCron else { return }
        saving = true
        saveError = nil
        do {
            try await client.updateAutoGrab(UpdateAutoGrabBody(searchOnAdd: searchOnAdd, releaseCheckCron: cron))
            loaded = Saved(searchOnAdd: searchOnAdd, cron: cron)
            if case .custom = schedule, let preset = ReleaseCheckCron.preset(for: cron) {
                schedule = .preset(preset)
            }
            await refreshChecks()
        } catch {
            saveError = settingsErrorMessage(error)
        }
        saving = false
    }

    private func grabNow(_ item: PendingRelease) async {
        guard let client = model.api() else { return }
        grabbingKey = item.targetKey
        defer { grabbingKey = nil }
        do {
            let result = try await client.grabPendingNow(targetKey: item.targetKey)
            if result.grabbed {
                model.toast(String(localized: "Grabbing \(item.mediaTitle)"), style: .success)
            } else {
                model.toast(AutoGrabText.grabFailure(result.reason), style: .error)
            }
        } catch {
            model.toast(settingsErrorMessage(error), style: .error)
        }
        await refreshHeld()
    }
}

/// Wording for server-side check ids and grab outcomes.
enum AutoGrabText {
    private static func clientName(_ type: String?) -> String {
        switch type {
        case "qbittorrent": "qBittorrent"
        case "transmission": "Transmission"
        case "deluge": "Deluge"
        default: type ?? "The download client"
        }
    }

    private static func managerName(_ manager: String?) -> String {
        manager == "jackett" ? "Jackett" : "Prowlarr"
    }

    static func grabFailure(_ reason: GrabPendingReason?) -> String {
        switch reason {
        case .noSpace: String(localized: "Not enough free space to grab it.")
        case .notWanted: String(localized: "It is no longer wanted.")
        case .alreadyActive: String(localized: "It is already downloading.")
        case .allFailed: String(localized: "Every held release was blocked or failed.")
        case nil: String(localized: "Nothing was grabbed.")
        }
    }

    // swiftlint:disable:next cyclomatic_complexity function_body_length
    static func readiness(_ check: GrabReadinessCheck) -> String {
        let p = check.params
        let manager = managerName(p.manager)
        switch (check.id, check.status) {
        case ("indexer_manager", .error):
            if p.reason == "unreachable" {
                return String(localized: "Can't reach \(manager), so searches and RSS checks fail.")
            }
            return String(localized: "No indexer manager is set up, so nothing can be searched.")
        case ("indexer_manager", .warn):
            return String(localized: "\(manager) is connected but has no enabled indexers, so searches find nothing.")
        case ("indexer_manager", .ok):
            let count = p.indexers ?? 0
            return count == 1
                ? String(localized: "\(manager) is connected with 1 indexer enabled.")
                : String(localized: "\(manager) is connected with \(count) indexers enabled.")
        case ("download_client", .error):
            if p.reason == "unreachable" {
                return String(localized: "Can't reach \(clientName(p.clientType)), so grabs fail.")
            }
            return String(localized: "No download client is set up, so releases have nowhere to go.")
        case ("download_client", _):
            return String(localized: "\(clientName(p.clientType)) is connected.")
        case ("default_movie_profile", .ok):
            return String(localized: "New movies use the \(p.profileName ?? "") quality profile.")
        case ("default_movie_profile", _):
            return String(localized: "No default movie quality profile: new movies accept any release.")
        case ("default_show_profile", .ok):
            return String(localized: "New shows use the \(p.profileName ?? "") quality profile.")
        case ("default_show_profile", _):
            return String(localized: "No default show quality profile: new shows accept any release.")
        case ("rss_indexers", .ok):
            return String(localized: "RSS checks watch \(p.watched ?? 0) of \(p.total ?? 0) indexers.")
        case ("rss_indexers", _):
            return String(localized: "RSS checks watch no indexer, so new releases are never picked up on their own.")
        case ("profiles_without_maximum", .ok):
            return String(localized: "Every quality profile has a maximum resolution.")
        case ("profiles_without_maximum", _):
            let count = p.profiles?.count ?? 0
            return count == 1
                ? String(localized: "1 quality profile has no maximum resolution, so a 1080p profile can still grab 4K.")
                : String(localized: "\(count) quality profiles have no maximum resolution, so a 1080p profile can still grab 4K.")
        case ("search_on_add", _):
            return p.enabled == false
                ? String(localized: "Search waits for the scheduled check after a movie or show is added.")
                : String(localized: "Search starts as soon as a movie or show is added.")
        default:
            return check.id
        }
    }
}
