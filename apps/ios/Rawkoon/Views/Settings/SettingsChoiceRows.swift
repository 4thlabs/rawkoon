import SwiftUI

struct ToggleRow: View {
    private let title: Text
    @Binding var isOn: Bool
    private let subtitle: Text?

    init(_ title: LocalizedStringKey, isOn: Binding<Bool>, subtitle: LocalizedStringKey? = nil) {
        self.title = Text(title)
        _isOn = isOn
        self.subtitle = subtitle.map { Text($0) }
    }

    init<S: StringProtocol>(_ title: S, isOn: Binding<Bool>, subtitle: S? = nil) {
        self.title = Text(title)
        _isOn = isOn
        self.subtitle = subtitle.map { Text($0) }
    }

    var body: some View {
        Toggle(isOn: $isOn) {
            VStack(alignment: .leading, spacing: 2) {
                title.foregroundStyle(Theme.text)
                if let subtitle {
                    subtitle.font(.footnote).foregroundStyle(Theme.muted)
                }
            }
        }
        .tint(Theme.apricot)
        .listRowBackground(Theme.raised)
    }
}

struct PickerRow<T: Hashable>: View {
    private let title: Text
    @Binding var selection: T
    private let options: [(value: T, label: Text)]

    init(
        title: LocalizedStringKey,
        selection: Binding<T>,
        options: [(value: T, label: LocalizedStringKey)]
    ) {
        self.title = Text(title)
        _selection = selection
        self.options = options.map { ($0.value, Text($0.label)) }
    }

    init(
        title: LocalizedStringKey,
        selection: Binding<T>,
        options: [(value: T, label: String)]
    ) {
        self.title = Text(title)
        _selection = selection
        self.options = options.map { ($0.value, Text(verbatim: $0.label)) }
    }

    var body: some View {
        Picker(selection: $selection) {
            ForEach(options, id: \.value) { option in
                option.label.tag(option.value)
            }
        } label: {
            title
        }
        .tint(Theme.apricot)
        .listRowBackground(Theme.raised)
    }
}

struct SegmentedRow<T: Hashable>: View {
    private let title: Text
    @Binding var selection: T
    private let options: [(value: T, label: Text)]

    init(
        title: LocalizedStringKey,
        selection: Binding<T>,
        options: [(value: T, label: LocalizedStringKey)]
    ) {
        self.title = Text(title)
        _selection = selection
        self.options = options.map { ($0.value, Text($0.label)) }
    }

    init(
        title: LocalizedStringKey,
        selection: Binding<T>,
        options: [(value: T, label: String)]
    ) {
        self.title = Text(title)
        _selection = selection
        self.options = options.map { ($0.value, Text(verbatim: $0.label)) }
    }

    var body: some View {
        VStack(alignment: .leading, spacing: 6) {
            title.font(.footnote).foregroundStyle(Theme.muted)
            Picker(selection: $selection) {
                ForEach(options, id: \.value) { option in
                    option.label.tag(option.value)
                }
            } label: {
                title
            }
            .pickerStyle(.segmented)
        }
        .listRowBackground(Theme.raised)
    }
}
