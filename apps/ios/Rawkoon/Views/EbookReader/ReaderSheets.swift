@preconcurrency import ReadiumNavigator
@preconcurrency import ReadiumShared
import SwiftUI

// MARK: - Table of contents

struct TableOfContentsSheet: View {
    let links: [EPUBLink]
    let currentLocator: Locator?
    let onSelect: (EPUBLink) -> Void
    @Environment(\.dismiss) private var dismiss

    var body: some View {
        NavigationStack {
            Group {
                if links.isEmpty {
                    Text("This book has no table of contents.")
                        .font(.subheadline)
                        .foregroundStyle(Theme.muted)
                        .frame(maxWidth: .infinity, maxHeight: .infinity)
                } else {
                    List {
                        TOCSection(links: links, currentLocator: currentLocator, onSelect: onSelect)
                    }
                    .listStyle(.plain)
                    .scrollContentBackground(.hidden)
                }
            }
            .background(Theme.base)
            .navigationTitle("Contents")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .topBarTrailing) {
                    Button("Done") { dismiss() }
                }
            }
        }
    }
}

struct TOCSection: View {
    let links: [EPUBLink]
    let currentLocator: Locator?
    let onSelect: (EPUBLink) -> Void

    var body: some View {
        ForEach(Array(links.enumerated()), id: \.offset) { _, link in
            if link.children.isEmpty {
                TOCRow(link: link, currentLocator: currentLocator, onSelect: onSelect)
            } else {
                DisclosureGroup {
                    TOCSection(links: link.children, currentLocator: currentLocator, onSelect: onSelect)
                } label: {
                    TOCRow(link: link, currentLocator: currentLocator, onSelect: onSelect)
                }
            }
        }
        .listRowBackground(Theme.raised)
    }
}

struct TOCRow: View {
    let link: EPUBLink
    let currentLocator: Locator?
    let onSelect: (EPUBLink) -> Void

    private var isCurrent: Bool {
        guard let currentLocator else { return false }
        return link.url().isEquivalentTo(currentLocator.href)
    }

    private var title: String {
        if let title = link.title, !title.isEmpty {
            return title
        }
        return link.href
    }

    var body: some View {
        Button {
            onSelect(link)
        } label: {
            Text(title)
                .font(.body)
                .foregroundStyle(isCurrent ? Theme.apricot : Theme.textStrong)
                .frame(maxWidth: .infinity, alignment: .leading)
        }
    }
}

// MARK: - Settings

struct ReaderSettingsSheet: View {
    @Binding var preferences: ReaderPreferences
    @Environment(\.dismiss) private var dismiss

    var body: some View {
        NavigationStack {
            Form {
                Section("Typography") {
                    Stepper(value: $preferences.fontSize, in: 0.7 ... 2.0, step: 0.1) {
                        HStack {
                            Text("Font size")
                                .foregroundStyle(Theme.text)
                            Spacer()
                            Text("\(Int((preferences.fontSize * 100).rounded()))%")
                                .foregroundStyle(Theme.muted)
                        }
                    }
                    Stepper(value: $preferences.lineHeight, in: 1.0 ... 2.0, step: 0.1) {
                        HStack {
                            Text("Line height")
                                .foregroundStyle(Theme.text)
                            Spacer()
                            Text(String(format: "%.1f", preferences.lineHeight))
                                .foregroundStyle(Theme.muted)
                        }
                    }
                    Stepper(value: $preferences.pageMargins, in: 0.0 ... 4.0, step: 0.3) {
                        HStack {
                            Text("Page margins")
                                .foregroundStyle(Theme.text)
                            Spacer()
                            Text(String(format: "%.1f", preferences.pageMargins))
                                .foregroundStyle(Theme.muted)
                        }
                    }
                }
                .listRowBackground(Theme.raised)

                Section("Theme") {
                    Picker("Theme", selection: $preferences.theme) {
                        ForEach(ReaderTheme.allCases) { theme in
                            Text(theme.title).tag(theme)
                        }
                    }
                    .pickerStyle(.segmented)
                }
                .listRowBackground(Theme.raised)
            }
            .scrollContentBackground(.hidden)
            .background(Theme.base)
            .navigationTitle("Reader")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .topBarTrailing) {
                    Button("Done") { dismiss() }
                }
            }
        }
    }
}
