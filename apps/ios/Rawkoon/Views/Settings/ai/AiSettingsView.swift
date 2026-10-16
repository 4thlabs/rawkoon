import SwiftUI

/// Admin "AI" settings: the provider configuration. Usage and the call history are under System > AI usage.
struct AiSettingsView: View {
    @Environment(AppModel.self) private var model

    @State private var config = AiProviderConfigModel()

    var body: some View {
        Group {
            if !model.isAdmin {
                ContentUnavailableView("Admin only", systemImage: "lock")
                    .rawkoonLivingSymbol(.empty)
            } else {
                form
            }
        }
        .navigationTitle("AI")
        .navigationBarTitleDisplayMode(.inline)
    }

    private var form: some View {
        Form {
            SettingsStateView(isLoading: config.loading, error: config.loadError, retry: { Task { await reloadConfig() } }) {
                AiProviderConfigSections(config: config, api: { model.api() })
            }
        }
        .scrollContentBackground(.hidden)
        .readableWidth()
        .background(Theme.base)
        .tint(Theme.apricot)
        .toolbar {
            ToolbarItem(placement: .topBarTrailing) {
                if config.saving {
                    ProgressView().tint(Theme.apricot)
                } else {
                    Button("Save") { Task { await save() } }
                        .disabled(!config.isDirty)
                        .requiresConnection(model.isOffline)
                }
            }
        }
        .task { await reloadConfig() }
    }

    private func reloadConfig() async {
        await config.load(api: model.api())
    }

    private func save() async {
        await config.save(api: model.api())
    }
}
