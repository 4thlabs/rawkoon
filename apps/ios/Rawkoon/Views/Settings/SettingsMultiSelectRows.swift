import SwiftUI

/// Pushes a checklist of options; enforces `minSelection` by disabling the last
/// remaining checkmark.
struct MultiSelectRow<T: Hashable>: View {
    private let titleKey: LocalizedStringKey
    @Binding var selected: Set<T>
    private let options: [(value: T, label: Text)]
    var minSelection: Int = 0

    init(
        title: LocalizedStringKey,
        selected: Binding<Set<T>>,
        options: [(value: T, label: LocalizedStringKey)],
        minSelection: Int = 0
    ) {
        titleKey = title
        _selected = selected
        self.options = options.map { ($0.value, Text($0.label)) }
        self.minSelection = minSelection
    }

    init(
        title: LocalizedStringKey,
        selected: Binding<Set<T>>,
        options: [(value: T, label: String)],
        minSelection: Int = 0
    ) {
        titleKey = title
        _selected = selected
        self.options = options.map { ($0.value, Text(verbatim: $0.label)) }
        self.minSelection = minSelection
    }

    var body: some View {
        NavigationLink {
            List {
                ForEach(options, id: \.value) { option in
                    Button {
                        withRawkoonMotion(RawkoonMotion.snappy) { toggle(option.value) }
                    } label: {
                        HStack {
                            option.label.foregroundStyle(Theme.text)
                            Spacer()
                            SelectionCheck(isOn: selected.contains(option.value))
                        }
                    }
                    .listRowBackground(Theme.raised)
                }
            }
            .scrollContentBackground(.hidden)
            .readableWidth()
            .background(Theme.base)
            .navigationTitle(titleKey)
            .navigationBarTitleDisplayMode(.inline)
        } label: {
            HStack {
                Text(titleKey).foregroundStyle(Theme.text)
                Spacer()
                Text("\(selected.count)").foregroundStyle(Theme.muted)
                    .rawkoonNumeric(Double(selected.count))
            }
        }
        .listRowBackground(Theme.raised)
    }

    private func toggle(_ value: T) {
        if selected.contains(value) {
            if selected.count > minSelection {
                selected.remove(value)
            }
        } else {
            selected.insert(value)
        }
    }
}

/// Multi-select whose order carries meaning — index 0 is the highest priority.
/// Deliberately array-backed: `MultiSelectRow` stores a `Set`, and saving a Set
/// reshuffles the server-side ranking that scores releases.
struct OrderedMultiSelectRow<T: Hashable>: View {
    private let titleKey: LocalizedStringKey
    @Binding var selected: [T]
    private let options: [(value: T, label: Text)]

    init(
        title: LocalizedStringKey,
        selected: Binding<[T]>,
        options: [(value: T, label: LocalizedStringKey)]
    ) {
        titleKey = title
        _selected = selected
        self.options = options.map { ($0.value, Text($0.label)) }
    }

    init(
        title: LocalizedStringKey,
        selected: Binding<[T]>,
        options: [(value: T, label: String)]
    ) {
        titleKey = title
        _selected = selected
        self.options = options.map { ($0.value, Text(verbatim: $0.label)) }
    }

    var body: some View {
        NavigationLink {
            OrderedMultiSelectList(titleKey: titleKey, selected: $selected, options: options)
        } label: {
            HStack {
                Text(titleKey).foregroundStyle(Theme.text)
                Spacer()
                Text("\(selected.count)").foregroundStyle(Theme.muted)
                    .rawkoonNumeric(Double(selected.count))
            }
        }
        .listRowBackground(Theme.raised)
    }
}

/// The pushed half of `OrderedMultiSelectRow`, split out so a debug screen can
/// render it directly — `simctl` cannot tap, so a screen behind a NavigationLink
/// is otherwise unscreenshottable.
struct OrderedMultiSelectList<T: Hashable>: View {
    let titleKey: LocalizedStringKey
    @Binding var selected: [T]
    let options: [(value: T, label: Text)]

    private func label(for value: T) -> Text {
        options.first { $0.value == value }?.label ?? Text(verbatim: "\(value)")
    }

    private var available: [(value: T, label: Text)] {
        options.filter { !selected.contains($0.value) }
    }

    var body: some View {
        List {
            Section {
                if selected.isEmpty {
                    Text("Nothing selected.")
                        .foregroundStyle(Theme.muted)
                        .listRowBackground(Theme.raised)
                }
                ForEach(selected, id: \.self) { value in
                    HStack(spacing: 10) {
                        Text(verbatim: "\((selected.firstIndex(of: value) ?? 0) + 1).")
                            .font(.footnote.monospacedDigit())
                            .foregroundStyle(Theme.muted)
                        label(for: value).foregroundStyle(Theme.text)
                    }
                    .listRowBackground(Theme.raised)
                }
                .onMove { selected.move(fromOffsets: $0, toOffset: $1) }
                .onDelete { selected.remove(atOffsets: $0) }
            } header: {
                Text("Priority order")
            } footer: {
                Text("First is preferred. Tap Edit to reorder, swipe to remove.")
            }

            if !available.isEmpty {
                Section {
                    ForEach(available, id: \.value) { option in
                        Button {
                            withRawkoonMotion(RawkoonMotion.snappy) { selected.append(option.value) }
                        } label: {
                            HStack {
                                option.label.foregroundStyle(Theme.text)
                                Spacer()
                                Image(systemName: "plus.circle")
                                    .foregroundStyle(Theme.apricot)
                            }
                        }
                        .listRowBackground(Theme.raised)
                    }
                } header: {
                    Text("Add")
                }
            }
        }
        .scrollContentBackground(.hidden)
        .readableWidth()
        .background(Theme.base)
        .navigationTitle(titleKey)
        .navigationBarTitleDisplayMode(.inline)
        .toolbar {
            ToolbarItem(placement: .topBarTrailing) {
                EditButton().tint(Theme.apricot)
            }
        }
    }
}

/// A multi-select checkmark that pops in and out; it bounces on a tap, not when the list first shows.
private struct SelectionCheck: View {
    let isOn: Bool
    @State private var armed = false

    var body: some View {
        ZStack {
            if isOn {
                Image(systemName: "checkmark")
                    .foregroundStyle(Theme.apricot)
                    .rawkoonBounceOnInsert(armed: armed)
                    .transition(.rawkoonPop)
            }
        }
        .onAppear { armed = true }
    }
}
