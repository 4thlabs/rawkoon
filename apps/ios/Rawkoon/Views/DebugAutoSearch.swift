#if DEBUG
    // motion-ok-file: debug-only harness
    import RawkoonKit
    import SwiftUI

    /// Fixture of the movie Management card (lamp states) and the post-profile-change
    /// upgrade dialog — `RAWKOON_SCREEN=autoSearchIdle|autoSearchBusy|upgradeDialog`.
    struct DebugAutoSearch: View {
        let searching: Bool
        let dialog: Bool
        @State private var request: ConfirmRequest?

        var body: some View {
            ZStack {
                Theme.base.ignoresSafeArea()
                VStack(alignment: .leading, spacing: 16) {
                    HStack {
                        Text("Management")
                            .font(.sectionTitle)
                            .foregroundStyle(Theme.textStrong)
                        Spacer()
                        Image(systemName: "ellipsis.circle")
                            .font(.title3)
                            .foregroundStyle(Theme.apricot)
                    }
                    MovieAutoSearchLamp(isSearching: searching, onAutoSearch: {}, onChoose: {})
                    Divider().overlay(Theme.border)
                    Toggle("Monitored", isOn: .constant(true)).tint(Theme.terracotta)
                    HStack {
                        Text("Status").font(.subheadline).foregroundStyle(Theme.text)
                        Spacer()
                        Text("Wanted").font(.subheadline).foregroundStyle(Theme.muted)
                    }
                    HStack {
                        Text("Quality profile").font(.subheadline).foregroundStyle(Theme.text)
                        Spacer()
                        Text(verbatim: "1080p FR").font(.subheadline).foregroundStyle(Theme.muted)
                    }
                }
                .padding(14)
                .background(Theme.raised, in: RoundedRectangle(cornerRadius: 14))
                .overlay(RoundedRectangle(cornerRadius: 14).strokeBorder(Theme.border, lineWidth: 1))
                .padding(.horizontal, 16)
            }
            .preferredColorScheme(.dark)
            .task {
                guard dialog else { return }
                try? await Task.sleep(for: .milliseconds(500))
                request = ConfirmRequest.upgradePrompt(
                    isShow: false,
                    profileName: "4K HDR",
                    affectedEpisodes: 0,
                    onAutoSearch: {},
                    onChoose: {}
                )
            }
            .alert(
                request?.title ?? "",
                isPresented: Binding(get: { request != nil }, set: {
                    if !$0 {
                        request = nil
                    }
                }),
                presenting: request
            ) { request in
                Button(request.confirmTitle) {}
                if let secondary = request.secondaryTitle {
                    Button(secondary) {}
                }
                Button(request.cancelTitle ?? "Cancel", role: .cancel) {}
            } message: { request in
                Text(request.message)
            }
        }
    }
#endif
