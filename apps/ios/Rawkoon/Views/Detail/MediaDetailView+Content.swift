import RawkoonKit
import SwiftUI

extension MediaDetailView {
    @ViewBuilder
    var mainContent: some View {
        if loading, details == nil {
            detailSkeleton
        } else if details == nil, detailsUnreachable {
            // Offline with nothing saved: keep the identity the caller passed in.
            DetailHero(
                title: title,
                posterPath: resolvedPosterPath,
                backdropPath: nil,
                metaLine: "",
                tagline: nil,
                statusText: detailStatusText,
                statusTint: detailStatusTint
            )
            Text("Details will load when you're back online.")
                .font(.subheadline)
                .foregroundStyle(Theme.muted)
                .padding(.horizontal, 16)
        } else if let errorMessage, details == nil {
            ContentUnavailableView(
                "Couldn't load details",
                systemImage: "exclamationmark.triangle",
                description: Text(errorMessage)
            )
            .rawkoonLivingSymbol(.error)
            .padding(.top, 28)
        } else {
            // Hero + primary action stay pinned above the segmented content, the
            // way the web keeps the title header above its detail tabs.
            DetailHero(
                title: title,
                posterPath: resolvedPosterPath,
                backdropPath: details?.primaryBackdropUrl,
                metaLine: metaLine,
                tagline: details?.tagline,
                statusText: detailStatusText,
                statusTint: detailStatusTint
            )
            primaryAction
            if availableTabs.count > 1 {
                detailTabBar
            }
            switch activeTab {
            case .info:
                infoSections
            case .similar:
                similarSection
            case .manage:
                if showManagement {
                    managementSections
                }
            }
        }
    }

    /// In-content tab switcher under the hero — an icon + label underline control
    /// that mirrors the web detail tabs. Deliberately NOT a bottom bar replacing
    /// the app tab bar: `.toolbar(.hidden, for: .tabBar)` is unreliable across iOS
    /// versions and a competing bottom strip double-stacks with the tab bar.
    var detailTabBar: some View {
        HStack(spacing: 0) {
            ForEach(availableTabs) { tab in
                let isActive = activeTab == tab
                Button {
                    withRawkoonMotion(.easeInOut(duration: 0.15)) { detailTab = tab }
                } label: {
                    VStack(spacing: 6) {
                        Label(tab.label, systemImage: tab.systemImage)
                            .labelStyle(.titleAndIcon)
                            .font(.subheadline.weight(.medium))
                            .foregroundStyle(isActive ? Theme.textStrong : Theme.muted)
                            .lineLimit(1)
                        Capsule()
                            .fill(isActive ? Theme.apricot : Color.clear)
                            .frame(height: 2)
                    }
                    .frame(maxWidth: .infinity)
                    .contentShape(Rectangle())
                }
                .buttonStyle(.plain)
                .accessibilityAddTraits(isActive ? .isSelected : [])
            }
        }
        .padding(.horizontal, 16)
        .overlay(alignment: .bottom) {
            Divider().overlay(Theme.border)
        }
    }

    @ViewBuilder
    var infoSections: some View {
        DetailFactsStrip(details: details, ratings: ratings, mediaType: mediaType, loading: loading)
        overview
        DetailCastRow(credits: credits, loading: loading)
        if DetailWhereToWatch.hasContent(trailer: trailer, providers: providers) {
            DetailWhereToWatch(trailer: trailer, providers: providers)
        }
        if mediaType == "tv" {
            seasonsSection
        }
    }

    /// Warm shimmer for the first paint: a hero band (backdrop + poster thumb +
    /// title lines) and a few overview lines, shaped like the real content.
    var detailSkeleton: some View {
        VStack(alignment: .leading, spacing: 18) {
            ZStack(alignment: .bottomLeading) {
                ShimmerView(cornerRadius: 0)
                    .frame(maxWidth: .infinity)
                    .frame(height: 260)
                HStack(alignment: .bottom, spacing: 16) {
                    ShimmerView(cornerRadius: 10)
                        .frame(width: 96, height: 144)
                    VStack(alignment: .leading, spacing: 8) {
                        ShimmerView(cornerRadius: 6).frame(width: 180, height: 26)
                        ShimmerView(cornerRadius: 4).frame(width: 90, height: 18)
                        ShimmerView(cornerRadius: 4).frame(width: 120, height: 12)
                    }
                    Spacer(minLength: 0)
                }
                .padding(.horizontal, 16)
                .padding(.bottom, 16)
            }
            .frame(maxWidth: .infinity)
            .frame(height: 260)

            VStack(alignment: .leading, spacing: 8) {
                ShimmerView(cornerRadius: 4).frame(height: 12)
                ShimmerView(cornerRadius: 4).frame(height: 12)
                ShimmerView(cornerRadius: 4).frame(width: 220, height: 12)
            }
            .padding(.horizontal, 16)
        }
        .allowsHitTesting(false)
    }

    var overview: some View {
        Group {
            if let overview = details?.overview, !overview.isEmpty {
                Text(overview)
                    .font(.subheadline)
                    .foregroundStyle(Theme.muted)
                    .padding(.horizontal, 16)
            }
        }
    }

    // MARK: Meta

    var metaLine: String {
        var parts: [String] = []
        if let year = yearValue {
            parts.append(String(year))
        }
        if mediaType == "tv" {
            parts.append(String(localized: "\(details?.numberOfSeasons ?? 0) seasons"))
        } else if let runtime = Formatters.runtimeMinutes(details?.runtime) {
            parts.append(runtime)
        }
        if let genres = details?.genres, !genres.isEmpty {
            parts.append(genres.map(\.name).joined(separator: ", "))
        }
        return parts.joined(separator: " · ")
    }

    var yearValue: Int? {
        let raw = mediaType == "tv" ? details?.firstAirDate : details?.releaseDate
        guard let raw, raw.count >= 4 else { return nil }
        return Int(raw.prefix(4))
    }
}
