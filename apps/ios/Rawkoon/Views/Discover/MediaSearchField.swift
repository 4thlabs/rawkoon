import RawkoonKit
import SwiftUI

/// The one Find search field, above Browse and Swipe. Two or more characters
/// swap them for `FindSearchResults`.
struct MediaSearchField: View {
    @Binding var query: String
    var focus: FocusState<Bool>.Binding?

    @FocusState private var unusedFocus: Bool

    var body: some View {
        HStack(spacing: 8) {
            Image(systemName: "magnifyingglass")
                .foregroundStyle(Theme.muted)
            TextField("Search your library, movies, shows & books", text: $query)
                .focused(focus ?? $unusedFocus)
                .foregroundStyle(Theme.text)
                .autocorrectionDisabled()
                .textInputAutocapitalization(.never)
            if !query.isEmpty {
                Button {
                    query = ""
                } label: {
                    Image(systemName: "xmark.circle.fill")
                        .foregroundStyle(Theme.faint)
                        // A 44pt hit area without growing the field.
                        .padding(12)
                        .contentShape(Rectangle())
                        .padding(-12)
                }
                .accessibilityLabel("Clear")
            }
        }
        .padding(.horizontal, 12)
        .padding(.vertical, 10)
        .background(Theme.inset, in: RoundedRectangle(cornerRadius: 12))
        .overlay(RoundedRectangle(cornerRadius: 12).strokeBorder(Theme.border, lineWidth: 1))
        .padding(.horizontal, 16)
    }

    static func isActive(_ query: String) -> Bool {
        FindSearch.isActive(query)
    }
}
