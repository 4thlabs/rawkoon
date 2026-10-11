import RawkoonKit
import SwiftUI

/// Shared by LibraryView and BookView. A second copy would drift; `.searchable`
/// would change a screen that currently works.
func searchField(_ placeholder: LocalizedStringKey, text: Binding<String>) -> some View {
    searchFieldStack(text: text) {
        TextField(placeholder, text: text)
    }
}

func searchField(_ placeholder: some StringProtocol, text: Binding<String>) -> some View {
    searchFieldStack(text: text) {
        TextField(placeholder, text: text)
    }
}

private func searchFieldStack(
    text: Binding<String>,
    @ViewBuilder field: () -> some View
) -> some View {
    HStack(spacing: 8) {
        Image(systemName: "magnifyingglass")
            .font(.caption)
            .foregroundStyle(Theme.muted)
        field()
            .foregroundStyle(Theme.textStrong)
            .autocorrectionDisabled()
            .textInputAutocapitalization(.never)
        if !text.wrappedValue.isEmpty {
            Button {
                text.wrappedValue = ""
            } label: {
                Image(systemName: "xmark.circle.fill")
                    .foregroundStyle(Theme.faint)
                    // A 44pt hit area without growing the field.
                    .padding(12)
                    .contentShape(Rectangle())
                    .padding(-12)
            }
            .buttonStyle(.plain)
            .accessibilityLabel("Clear")
        }
    }
    .padding(.horizontal, 12)
    .padding(.vertical, 10)
    .background(Theme.inset, in: RoundedRectangle(cornerRadius: 12))
    .overlay(RoundedRectangle(cornerRadius: 12).strokeBorder(Theme.border, lineWidth: 1))
}

/// One chapter as a "spine": a lit bar for the current chapter, filled for a
/// downloaded one, hollow for not-yet. Order is the sequence — honest structure.
struct SpineRow: View {
    let index: Int
    let title: String
    let downloaded: Bool
    let current: Bool
    /// Live 0...1 while this chapter is downloading, else nil.
    var downloadFraction: Double?
    /// Set on the one chapter holding a stored resume point; the row then opens
    /// there rather than at the chapter's start.
    var resumeText: String?

    var body: some View {
        HStack(spacing: 10) {
            spine
            Text(String(format: "%02d", index + 1))
                .font(.system(.caption2, design: .monospaced))
                .foregroundStyle(Theme.faint)
                .frame(width: 22, alignment: .leading)
            Text(title)
                .font(.subheadline)
                .fontWeight(current ? .semibold : .regular)
                .foregroundStyle(current ? Theme.textStrong : Theme.muted)
                .lineLimit(1)
            Spacer(minLength: 0)
            if let resumeText {
                Text(resumeText)
                    .font(.caption2)
                    .foregroundStyle(Theme.apricot)
                    .lineLimit(1)
                    .layoutPriority(1)
            }
        }
        .padding(.vertical, 2)
    }

    private var spine: some View {
        Group {
            if let fraction = downloadFraction, !downloaded {
                // Same 4x22 footprint as an idle pill, so rows never shift.
                let clamped = min(1, max(0, fraction))
                Capsule().fill(Theme.borderStrong)
                    .frame(width: 4, height: 22)
                    .overlay(alignment: .bottom) {
                        Rectangle().fill(Theme.progress)
                            .frame(height: 22 * clamped)
                    }
                    .clipShape(Capsule())
                    .shadow(color: Theme.apricot.opacity(0.25 + 0.45 * clamped), radius: 3 + 3 * clamped)
                    .rawkoonMotion(.linear(duration: 0.15), value: clamped)
            } else if current {
                Capsule().fill(Theme.progress).frame(width: 4, height: 30)
                    .shadow(color: Theme.apricot.opacity(0.55), radius: 6)
            } else {
                Capsule().fill(downloaded ? Theme.faint : Theme.borderStrong)
                    .frame(width: 4, height: 22)
            }
        }
    }
}

/// A merged book row: cover, title/author, and format chips (Audiobook / EPUB).
struct BookRow: View {
    let book: BookListItem
    let downloaded: Bool
    /// Audiobook listening fraction (0...1) for an in-progress book, else nil.
    var progress: Double?
    var menuItems: [BookCardMenuAction] = []
    var onMenuAction: (BookCardMenuAction) -> Void = { _ in }

    var body: some View {
        HStack(spacing: 12) {
            BookCover(url: book.coverURL, size: 56, corner: 10, zoomID: RawkoonZoom.book(book.bookId))

            VStack(alignment: .leading, spacing: 5) {
                Text(book.title)
                    .font(.display(14))
                    .foregroundStyle(Theme.textStrong)
                    .lineLimit(1)
                    .truncationMode(.tail)
                if let author = book.author, !author.isEmpty {
                    Text(author).font(.subheadline).foregroundStyle(Theme.muted).lineLimit(1)
                }
                HStack(spacing: 6) {
                    if book.hasAudiobook {
                        formatChip("Audiobook", tint: Theme.muted)
                    }
                    if book.hasEbook {
                        formatChip("Ebook", tint: Theme.muted)
                    }
                    // Inline, not a trailing column, so the badge can't narrow the title.
                    if book.isRead {
                        StatusBadge(verbatim: bookReadStatusText(), tint: Theme.seed)
                    }
                    if downloaded {
                        StatusBadge(text: "Offline", tint: Theme.seed)
                    }
                }
                if let progress, progress > 0.001, progress < 0.999 {
                    HStack(spacing: 8) {
                        DuskProgress(value: progress)
                        Text(verbatim: "\(Int(progress * 100))%")
                            .font(.system(.caption2, design: .monospaced))
                            .foregroundStyle(Theme.apricot)
                            .rawkoonNumeric(progress)
                    }
                    .padding(.top, 2)
                }
            }

            Spacer(minLength: 0)
        }
        .padding(12)
        .background(Theme.raised, in: RoundedRectangle(cornerRadius: 14))
        .overlay(RoundedRectangle(cornerRadius: 14).strokeBorder(Theme.border, lineWidth: 1))
        .bookCardContextMenu(items: menuItems, onAction: onMenuAction)
    }

    private func formatChip(_ text: LocalizedStringKey, tint: Color) -> some View {
        Text(text)
            .font(.system(.caption2, design: .monospaced))
            .foregroundStyle(tint)
            .chipCapsule(tint: tint)
    }
}
