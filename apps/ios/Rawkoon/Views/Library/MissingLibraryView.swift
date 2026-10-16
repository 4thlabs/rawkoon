import SwiftUI

/// The library filtered to wanted titles; Home's "See all" lands here.
struct MissingLibraryView: View {
    @State private var state: LibraryMediaModel = {
        let state = LibraryMediaModel()
        state.mediaStatus = .wanted
        return state
    }()

    var body: some View {
        LibraryMediaView(state: state)
            .background(Theme.base)
            .navigationTitle("Missing")
            .navigationBarTitleDisplayMode(.inline)
    }
}
