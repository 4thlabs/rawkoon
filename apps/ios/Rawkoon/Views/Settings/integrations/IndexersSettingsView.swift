import SwiftUI

/// Indexers (admin): one screen for the indexer manager. A Prowlarr | Jackett switch sets the
/// active manager and shows that manager's connection and RSS indexer picker, with the indexers it
/// serves listed below.
struct IndexersSettingsView: View {
    @Environment(AppModel.self) private var model

    @State private var kind: IndexerManagerKind = .prowlarr
    @State private var loaded = false
    @State private var savingKind = false

    var body: some View {
        Group {
            if model.isAdmin {
                VStack(spacing: 0) {
                    Picker("Indexer manager", selection: kindBinding) {
                        ForEach(IndexerManagerKind.allCases, id: \.self) { kind in
                            Text(kind.title).tag(kind)
                        }
                    }
                    .pickerStyle(.segmented)
                    .disabled(!loaded || savingKind)
                    .padding(.horizontal, 16)
                    .padding(.vertical, 8)
                    if loaded {
                        // Keyed by kind, so switching loads the other manager's connection fresh.
                        IndexerManagerIntegrationView(kind: kind) { IndexerListSection() }
                            .id(kind)
                    } else {
                        Spacer()
                        ProgressView().tint(Theme.apricot)
                        Spacer()
                    }
                }
                .background(Theme.base)
            } else {
                ContentUnavailableView("Admin only", systemImage: "lock")
                    .rawkoonLivingSymbol(.empty)
            }
        }
        .navigationTitle("Indexers")
        .navigationBarTitleDisplayMode(.inline)
        .task { await loadActiveManager() }
    }

    /// The switch writes through: choosing a manager makes it the active one.
    private var kindBinding: Binding<IndexerManagerKind> {
        Binding(get: { kind }, set: { newKind in
            guard newKind != kind else { return }
            let previous = kind
            kind = newKind
            Task { await setActive(newKind, previous: previous) }
        })
    }

    private func loadActiveManager() async {
        guard let client = model.api() else {
            loaded = true
            return
        }
        let active = try? await client.postProcessingSettings().settings.activeIndexerManager
        kind = active == "jackett" ? .jackett : .prowlarr
        loaded = true
    }

    private func setActive(_ newKind: IndexerManagerKind, previous: IndexerManagerKind) async {
        guard let client = model.api() else { return }
        savingKind = true
        defer { savingKind = false }
        do {
            try await client.setActiveIndexerManager(newKind.path)
        } catch {
            kind = previous
            model.toast(settingsErrorMessage(error), style: .error)
        }
    }
}

/// The indexers the active manager serves, read-only, as Form sections.
struct IndexerListSection: View {
    @Environment(AppModel.self) private var model

    @State private var indexers: [Indexer] = []
    @State private var loading = true
    @State private var errorMessage: String?

    var body: some View {
        Section {
            if loading, indexers.isEmpty {
                HStack {
                    Spacer()
                    ProgressView().tint(Theme.apricot)
                    Spacer()
                }
            } else if let errorMessage, indexers.isEmpty {
                Text(errorMessage).foregroundStyle(Theme.terracotta)
            } else if indexers.isEmpty {
                Text("No indexers are configured yet.").foregroundStyle(Theme.muted)
            }
            ForEach(indexers) { indexer in
                row(indexer)
            }
        } header: {
            Text("Indexers")
        }
        .listRowBackground(Theme.raised)
        .task { await load() }
    }

    private func row(_ indexer: Indexer) -> some View {
        HStack(alignment: .top, spacing: 10) {
            VStack(alignment: .leading, spacing: 6) {
                Text(verbatim: indexer.name)
                    .foregroundStyle(Theme.textStrong)
                    .lineLimit(2)
                HStack(spacing: 6) {
                    if let protocolType = indexer.protocolType, !protocolType.isEmpty {
                        chip(protocolType)
                    }
                    if let privacy = indexer.privacy, !privacy.isEmpty {
                        chip(privacy)
                    }
                }
            }
            Spacer(minLength: 8)
            StatusBadge(
                text: indexer.enabled ? "Enabled" : "Disabled",
                tint: indexer.enabled ? Theme.seed : Theme.muted
            )
        }
        .padding(.vertical, 2)
    }

    private func chip(_ text: String) -> some View {
        Text(verbatim: text.uppercased())
            .font(.system(.caption2, design: .monospaced))
            .foregroundStyle(Theme.faint)
            .padding(.horizontal, 8)
            .padding(.vertical, 3)
            .background(Theme.inset, in: Capsule())
    }

    private func load() async {
        guard let client = model.api() else {
            loading = false
            return
        }
        if indexers.isEmpty, let cached = client.cached(Endpoints.indexers) {
            indexers = cached.value.indexers
        }
        do {
            indexers = try await client.indexers().indexers
            errorMessage = nil
        } catch {
            if indexers.isEmpty {
                errorMessage = settingsErrorMessage(error)
            }
        }
        loading = false
    }
}
