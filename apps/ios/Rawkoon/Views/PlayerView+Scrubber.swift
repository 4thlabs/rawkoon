import RawkoonKit
import SwiftUI

extension PlayerView {
    // MARK: Scrubber

    var scrubber: some View {
        VStack(spacing: 8) {
            if let chapter = scrubberChapterScope {
                Slider(
                    value: $sliderPosition,
                    in: chapter.startSecs ... chapter.endSecs,
                    onEditingChanged: scrubChanged
                )
                .tint(Theme.apricot)
                .accessibilityLabel("Position in chapter")
                .accessibilityValue(formatTime(max(sliderPosition - chapter.startSecs, 0)))

                HStack {
                    Text(formatTime(max(sliderPosition - chapter.startSecs, 0)))
                    Spacer()
                    Text("−\(formatTime(max(chapter.endSecs - sliderPosition, 0)))")
                }
                .font(.system(.caption, design: .monospaced))
                .foregroundStyle(Theme.muted)
                .contentTransition(.numericText())
                .rawkoonMotion(RawkoonMotion.gentle, value: Int(sliderPosition))
                .accessibilityHidden(true)

                Text("\(formatTime(sliderPosition)) of \(formatTime(model.player.duration))")
                    .font(.system(.caption2, design: .monospaced))
                    .foregroundStyle(Theme.faint)
                    .contentTransition(.numericText())
                    .rawkoonMotion(RawkoonMotion.gentle, value: Int(sliderPosition))
                    .frame(maxWidth: .infinity, alignment: .leading)
                    .accessibilityLabel("Book position")
                    .accessibilityValue("\(formatTime(sliderPosition)) of \(formatTime(model.player.duration))")
            } else {
                Slider(
                    value: $sliderPosition,
                    in: 0 ... max(model.player.duration, 0.1),
                    onEditingChanged: scrubChanged
                )
                .tint(Theme.apricot)
                .accessibilityLabel("Position in book")
                .accessibilityValue(formatTime(sliderPosition))

                HStack {
                    Text(formatTime(sliderPosition))
                    Spacer()
                    Text("−\(formatTime(max(model.player.duration - sliderPosition, 0)))")
                }
                .font(.system(.caption, design: .monospaced))
                .foregroundStyle(Theme.muted)
                .contentTransition(.numericText())
                .rawkoonMotion(RawkoonMotion.gentle, value: Int(sliderPosition))
                .accessibilityHidden(true)
            }
        }
        .padding(.top, 8)
    }

    /// SwiftUI can call `onEditingChanged(false)` before the last thumb
    /// write lands on `sliderPosition`. One turn of the run loop lets that
    /// write commit so we seek to where the finger actually was, not where
    /// playback still is. Keep `isDraggingSlider` true across that hop so a
    /// tick cannot overwrite the value first.
    private func scrubChanged(_ editing: Bool) {
        if editing {
            isDraggingSlider = true
            if draggingChapterSnapshot == nil {
                draggingChapterSnapshot = model.player.currentChapter
            }
            return
        }
        DispatchQueue.main.async {
            model.player.seek(to: sliderPosition)
            isDraggingSlider = false
            draggingChapterSnapshot = nil
        }
    }

    /// The chapter the scrubber is scoped to, or nil to fall back to a
    /// whole-book slider.
    ///
    /// A zero-length chapter is rejected: `Slider(in:)` divides by the span, so a
    /// degenerate range produces NaN rather than a disabled control.
    var scrubberChapterScope: ManifestChapter? {
        let chapter = isDraggingSlider ? draggingChapterSnapshot : model.player.currentChapter
        guard let chapter, chapter.endSecs > chapter.startSecs else { return nil }
        return chapter
    }

    private func formatTime(_ seconds: Double) -> String {
        Formatters.durationTimestampRounded(seconds)
    }
}
