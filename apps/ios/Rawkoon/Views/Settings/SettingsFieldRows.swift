import SwiftUI

// Reusable settings form primitives (spec §4.7). Every editable settings screen
// composes these; no bespoke per-screen field styling. House style: Theme tokens,
// Form/Section-friendly rows with .listRowBackground(Theme.raised).
//
// User-facing text takes LocalizedStringKey so string literals extract into the
// String Catalog. Companion String / StringProtocol overloads display runtime
// values verbatim (server data, interpolations) and are preferred over
// LocalizedStringKey's String initializer, which would treat data as catalog keys.

struct LabeledTextFieldRow: View {
    private let title: Text
    @Binding var text: String
    private let placeholder: Placeholder
    var keyboard: UIKeyboardType = .default
    var autocaps: Bool = false
    var mono: Bool = false

    private enum Placeholder {
        case localized(LocalizedStringKey)
        case verbatim(String)
    }

    init(
        title: LocalizedStringKey,
        text: Binding<String>,
        placeholder: LocalizedStringKey = "",
        keyboard: UIKeyboardType = .default,
        autocaps: Bool = false,
        mono: Bool = false
    ) {
        self.title = Text(title)
        _text = text
        self.placeholder = .localized(placeholder)
        self.keyboard = keyboard
        self.autocaps = autocaps
        self.mono = mono
    }

    /// Localized title with a runtime placeholder (interpolation, ternary, data).
    init(
        title: LocalizedStringKey,
        text: Binding<String>,
        placeholder: String,
        keyboard: UIKeyboardType = .default,
        autocaps: Bool = false,
        mono: Bool = false
    ) {
        self.title = Text(title)
        _text = text
        self.placeholder = .verbatim(placeholder)
        self.keyboard = keyboard
        self.autocaps = autocaps
        self.mono = mono
    }

    init<S: StringProtocol>(
        title: S,
        text: Binding<String>,
        placeholder: S? = nil,
        keyboard: UIKeyboardType = .default,
        autocaps: Bool = false,
        mono: Bool = false
    ) {
        self.title = Text(title)
        _text = text
        self.placeholder = .verbatim(placeholder.map { String($0) } ?? "")
        self.keyboard = keyboard
        self.autocaps = autocaps
        self.mono = mono
    }

    var body: some View {
        VStack(alignment: .leading, spacing: 4) {
            title.font(.footnote).foregroundStyle(Theme.muted)
            placeholderField
                .keyboardType(keyboard)
                .textInputAutocapitalization(autocaps ? .sentences : .never)
                .autocorrectionDisabled(!autocaps)
                .font(mono ? .system(.body, design: .monospaced) : .body)
                .foregroundStyle(Theme.text)
        }
        .listRowBackground(Theme.raised)
    }

    @ViewBuilder
    private var placeholderField: some View {
        switch placeholder {
        case let .localized(key):
            TextField(key, text: $text)
        case let .verbatim(string):
            TextField(string, text: $text)
        }
    }
}

/// Write-only secret. Never renders the stored value; starts empty; a blank value
/// means "keep the existing secret" and must be omitted from the request body.
struct SecretFieldRow: View {
    private let title: Text
    @Binding var input: String
    var isStored: Bool = false

    init(title: LocalizedStringKey, input: Binding<String>, isStored: Bool = false) {
        self.title = Text(title)
        _input = input
        self.isStored = isStored
    }

    init(title: some StringProtocol, input: Binding<String>, isStored: Bool = false) {
        self.title = Text(title)
        _input = input
        self.isStored = isStored
    }

    var body: some View {
        VStack(alignment: .leading, spacing: 4) {
            title.font(.footnote).foregroundStyle(Theme.muted)
            storedOrRequiredField
                .textInputAutocapitalization(.never)
                .autocorrectionDisabled(true)
                .foregroundStyle(Theme.text)
        }
        .listRowBackground(Theme.raised)
    }

    @ViewBuilder
    private var storedOrRequiredField: some View {
        if isStored {
            SecureField(
                "\u{2022}\u{2022}\u{2022}\u{2022}\u{2022}\u{2022} (stored \u{2014} leave blank to keep)",
                text: $input
            )
        } else {
            SecureField("Required", text: $input)
        }
    }
}

struct NumberFieldRow: View {
    private let title: Text
    @Binding var value: Int?
    var range: ClosedRange<Int>?
    private let suffix: Text?
    @State private var text = ""

    init(
        _ title: LocalizedStringKey,
        value: Binding<Int?>,
        range: ClosedRange<Int>? = nil,
        suffix: LocalizedStringKey? = nil
    ) {
        self.title = Text(title)
        _value = value
        self.range = range
        self.suffix = suffix.map { Text($0) }
    }

    init<S: StringProtocol>(
        _ title: S,
        value: Binding<Int?>,
        range: ClosedRange<Int>? = nil,
        suffix: S? = nil
    ) {
        self.title = Text(title)
        _value = value
        self.range = range
        self.suffix = suffix.map { Text($0) }
    }

    var body: some View {
        HStack {
            title.foregroundStyle(Theme.text)
            Spacer()
            TextField("\u{2014}", text: $text)
                .keyboardType(.numberPad)
                .multilineTextAlignment(.trailing)
                .frame(maxWidth: 96)
                .foregroundStyle(Theme.text)
                .onChange(of: text) { _, newValue in
                    if newValue.isEmpty {
                        value = nil; return
                    }
                    if var parsed = Int(newValue.filter(\.isNumber)) {
                        if let range {
                            parsed = min(max(parsed, range.lowerBound), range.upperBound)
                        }
                        value = parsed
                    }
                }
            if let suffix {
                suffix.foregroundStyle(Theme.muted)
            }
        }
        .listRowBackground(Theme.raised)
        .onAppear { text = value.map(String.init) ?? "" }
    }
}
